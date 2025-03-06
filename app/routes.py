import json
import os
import zipfile
from datetime import datetime
from random import random

import requests
from collections import defaultdict
from flask import render_template, flash, request, send_from_directory, redirect, url_for, Response, Flask, jsonify
from gemmi import cif
from markupsafe import Markup
from openbabel import openbabel


application = Flask(__name__)
application.jinja_env.trim_blocks = True
application.jinja_env.lstrip_blocks = True
application.config['SECRET_KEY'] = str(random())
root_dir = os.path.dirname(os.path.abspath(__file__))

def log_access(request, code):
    with open(f'{root_dir}/calculated_structures/accesses.txt', 'a') as log_file:
        log_file.write(f'{request.remote_addr} {code} {datetime.now().strftime("%d/%m/%Y %H:%M:%S")}\n')

def download_data(code):
    data_dir = f'{root_dir}/calculated_structures/{code}'
    os.system(f"mkdir {data_dir}")
    s3_url = "https://s3.cl4.du.cesnet.cz/46b646c0_b0c7_45dd_8c7f_29536a545ca7:ceitec-biodata-pdbcharges"
    for file in [f"{code}.cif", f"output.txt", f"residual_warnings.json"]:
        response = requests.get(f'{s3_url}/{code}/{file}')
        if response.status_code == 200:
            with open(f'{data_dir}/{file}', 'w') as pdb_file:
                pdb_file.write(response.text)

    # modify residual warnings because of Mol*
    residual_warnings_file = f'{root_dir}/calculated_structures/{code}/residual_warnings.json'
    cif_file = f'{root_dir}/calculated_structures/{code}/{code}.cif'
    residual_warnings_exist = os.path.exists(residual_warnings_file)
    cif_file_exist = os.path.exists(cif_file)
    if residual_warnings_exist and cif_file_exist:

        doc = cif.read_file(cif_file)
        block = doc.sole_block()
        cif_data = set(zip(block.find_loop("_atom_site.label_comp_id"),
                           block.find_loop("_atom_site.auth_seq_id"),
                           block.find_loop("_atom_site.label_seq_id"),
                           block.find_loop("_atom_site.auth_asym_id"),
                           block.find_loop("_atom_site.label_asym_id")))

        residues = defaultdict(list)
        for residue in cif_data:
            residues[residue[0]].append({"resnums": residue[1:3], "chains": residue[3:5]})

        # load warning json file
        with open(residual_warnings_file) as warnings_file:
            warnings = json.load(warnings_file)

        modified_warnings = []
        for warning in warnings:
            matching_residues = []
            for residue in residues[warning["residue_name"]]:
                if str(warning["residue_id"]) in residue["resnums"] and str(warning["chain_id"]) in residue["chains"]:
                    matching_residues.append(residue)
            if len(matching_residues) == 1:
                modified_warnings.append({"auth_seq_id": matching_residues[0]["resnums"][0],
                                          "label_seq_id": matching_residues[0]["resnums"][1],
                                          "auth_asym_id": matching_residues[0]["chains"][0],
                                          "label_asym_id": matching_residues[0]["chains"][1],
                                          "residue_name": warning["residue_name"], "warning": warning["warning"]})

        with open(f'{root_dir}/calculated_structures/{code}/modified_residual_warnings.json', 'w') as modified_warning_file:
            modified_warning_file.write(json.dumps(modified_warnings, indent=4))



@application.route('/', methods=['GET', 'POST'])
def main_site():
    if request.method == 'POST':
        code = request.form['code'].strip().lower()
        data_dir = f'{root_dir}/calculated_structures/{code}'
        if not os.path.isdir(data_dir):
            download_data(code)
        if not os.path.exists(f'{root_dir}/calculated_structures/{code}/{code}.cif'):
            log_access(request, code)
            message = Markup(
                f'There is no results for structure with PDB ID <strong>{code}</strong>. The possible causes are:'
                f'<ul> '
                f'<li>A structure with such a PDB ID does not exist.</li>'
                f'<li>The structure with hydrogens has more than 99999 atoms.</li>'
                f'<li>The structure contains serious errors and cannot be used as input for calculating the partial atomic charge.</li></ul>  ')
            flash(message, 'warning')
            return render_template('index.html')

        return redirect(url_for('results', code=code))
    return render_template('index.html')


@application.route('/results')
def results():
    code = request.args.get('code').lower()
    log_access(request, code)
    data_dir = f'{root_dir}/calculated_structures/{code}'
    if not os.path.isdir(data_dir):
        download_data(code)
    if not os.path.exists(f'{root_dir}/calculated_structures/{code}/{code}.cif'):
        message = Markup(
            f'There is no results for structure with PDB ID <strong>{code}</strong>. The possible causes are:'
            f'<ul> '
            f'<li>A structure with such a PDB ID does not exist.</li>'
            f'<li>The structure with hydrogens has more than 99999 atoms.</li>'
            f'<li>The structure contains serious errors and cannot be used as input for calculating the partial atomic charge.</li></ul>  ')
        flash(message, 'warning')
        return render_template('results.html', code="None", n_ats="None", total_charge="None",
                               num_of_non_charge_atoms="None")

    with open(f"{data_dir}/{code}.cif", "r") as cif_file:
        charges = []
        lines = [line.strip() for line in cif_file.readlines()[::-1]]
        for line in lines:
            if line == "_sb_ncbr_partial_atomic_charges.charge":
                break
            charges.append(line.split()[2])
    charges_except_none = [float(charge) for charge in charges if charge != "?"]
    total_charge = round(sum(charges_except_none))
    n_ats = len(charges)
    
    with open(f"{data_dir}/residual_warnings.json", "r", encoding="utf-8") as warnings_file:
        warnings = json.load(warnings_file)
    with open(f"{data_dir}/modified_residual_warnings.json", "r", encoding="utf-8") as warnings_file:
        modified_warnings = json.load(warnings_file)
    
    return render_template('results.html',
                           code=code,
                           n_ats=n_ats,
                           total_charge=total_charge,
                           warnings=warnings,
                           modified_warnings=modified_warnings,
                           num_of_non_charge_atoms=n_ats-len(charges_except_none))

@application.route('/download_files')
def download_files():
    code = request.args.get('code')
    data_dir = f'{root_dir}/calculated_structures/{code}'

    # create txt file
    with open(f"{data_dir}/{code}.cif", "r") as cif_file:
        charges = []
        lines = [line.strip() for line in cif_file.readlines()[::-1]]
        for line in lines:
            if line == "_sb_ncbr_partial_atomic_charges.charge":
                break
            charges.append(line.split()[2])
    charges = charges[::-1]
    with open(f"{data_dir}/{code}_charges.txt", "w") as txt_file:
        txt_file.write(f"{code}\n{' '.join(charges)}")

    # create pqr file
    obConversion = openbabel.OBConversion()
    obConversion.SetInAndOutFormats("cif", "pqr")
    mol = openbabel.OBMol()
    obConversion.ReadFile(mol, f'{data_dir}/{code}.cif')
    obConversion.WriteFile(mol, f'{data_dir}/{code}.pqr')


    with open(f'{data_dir}/{code}.pqr') as pqr_file:
        pqr_file_lines = pqr_file.readlines()
    c = 0
    new_lines = []
    for line in pqr_file_lines:
        if line[:4] == 'ATOM':
            charge = charges[c]
            try:
                charge = float(charge)
                new_lines.append(line[:54] + '{:>8.4f}'.format(charge) + line[62:])
            except ValueError:
                new_lines.append(line[:54] + '  ?         ' + line[66:])
            c += 1
        else:
            new_lines.append(line)
    with open(f'{data_dir}/{code}.pqr', "w") as pqr_file:
        pqr_file.write(''.join(new_lines))

    try:
        with zipfile.ZipFile(f'{data_dir}/{code}_charges.zip', 'w') as zip:
            zip.write(f'{data_dir}/{code}.cif', arcname=f'{code}.cif')
            zip.write(f'{data_dir}/modified_residual_warnings.json', arcname=f'residual_warnings.json')
            zip.write(f'{data_dir}/{code}_charges.txt', arcname=f'{code}_charges.txt')
            zip.write(f'{data_dir}/{code}.pqr', arcname=f'{code}.pqr')
        return send_from_directory(data_dir, f'{code}_charges.zip', as_attachment=True)
    except FileNotFoundError:
        return render_template('404.html'), 404


@application.route('/structure/<code>')
def get_structure(code: str):
    filepath = f'{root_dir}/calculated_structures/{code}/{code}.cif'
    return Response(open(filepath, 'r').read(), mimetype='text/plain')

@application.errorhandler(404)
def page_not_found(error):
    return render_template('404.html'), 404
