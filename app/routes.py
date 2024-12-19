import json
import os
import zipfile
from random import random
from datetime import datetime
import requests

from markupsafe import Markup
from flask import render_template, flash, request, send_from_directory, redirect, url_for, Response, Flask, jsonify

application = Flask(__name__)
application.jinja_env.trim_blocks = True
application.jinja_env.lstrip_blocks = True
application.config['SECRET_KEY'] = str(random())
root_dir = os.path.dirname(os.path.abspath(__file__))

@application.route('/', methods=['GET', 'POST'])
def main_site():
    if request.method == 'POST':
        code = request.form['code'].strip().lower()
        with open(f'{root_dir}/calculated_structures/accesses.txt', 'a') as log_file:
            log_file.write(f'{request.remote_addr} {code} {datetime.now().strftime("%d/%m/%Y %H:%M:%S")}\n')
        data_dir = f'{root_dir}/calculated_structures/{code}'
        if not os.path.isdir(data_dir):
            os.system(f"mkdir {data_dir}")
            s3_url = "https://s3.cl4.du.cesnet.cz/46b646c0_b0c7_45dd_8c7f_29536a545ca7:ceitec-biodata-pdbcharges"
            for file in [f"{code}.cif", f"output.txt", f"residual_warnings.json"]:
                response = requests.get(f'{s3_url}/{code}/{file}')
                if response.status_code == 200:
                    with open(f'{data_dir}/{file}', 'w') as pdb_file:
                        pdb_file.write(response.text)
        if not os.path.exists(f'{root_dir}/calculated_structures/{code}/{code}.cif'):
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
    data_dir = f'{root_dir}/calculated_structures/{code}'

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
    return render_template('results.html',
                           code=code,
                           n_ats=n_ats,
                           total_charge=total_charge,
                           num_of_non_charge_atoms=n_ats-len(charges_except_none))

@application.route('/download_files')
def download_files():
    code = request.args.get('code')
    data_dir = f'{root_dir}/calculated_structures/{code}'
    with zipfile.ZipFile(f'{data_dir}/{code}_charges.zip', 'w') as zip:
        zip.write(f'{data_dir}/{code}.cif', arcname=f'{code}.cif')
        zip.write(f'{data_dir}/residual_warnings.json', arcname=f'residual_warnings.json')
    return send_from_directory(data_dir, f'{code}_charges.zip', as_attachment=True)

@application.route('/structure/<code>')
def get_structure(code: str):
    filepath = f'{root_dir}/calculated_structures/{code}/{code}.cif'
    return Response(open(filepath, 'r').read(), mimetype='text/plain')

@application.errorhandler(404)
def page_not_found(error):
    return render_template('404.html'), 404
