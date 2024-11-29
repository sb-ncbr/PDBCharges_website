import json
import os
import zipfile
from random import random
from time import sleep, time

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
        return redirect(url_for('results', code=code))
    return render_template('index.html')



@application.route('/results')
def results():
    code = request.args.get('code')
    data_dir = f'{root_dir}/calculated_structures/{code}'

    if not os.path.exists(data_dir):
        message = Markup(
            f'There is no results for structure with PDB code <strong>{code}</strong>. '
            f'The structure with PDB code <strong>{code}</strong> is either not found in PDB or partial atomic charges are not calculated yet.')
        flash(message, 'warning')
        return redirect(url_for('main_site'))

    charges = open(f'{data_dir}/charge_calculator/charges.txt', 'r').readlines()[0].split()
    charges_except_none = [float(charge) for charge in charges if charge != "None"]
    chg_range = round(max([abs(charge) for charge in charges_except_none]), 4)
    total_charge = round(sum(charges_except_none))
    n_ats = len(charges)
    return render_template('results.html',
                           code=code,
                           chg_range=chg_range,
                           n_ats=n_ats,
                           total_charge=total_charge,
                           non_calculated_atoms = n_ats - len(charges_except_none))



@application.route('/download_files')
def download_files():
    code = request.args.get('code')
    data_dir = f'{root_dir}/calculated_structures/{code}' # todo!
    with zipfile.ZipFile(f'{data_dir}/{code}.zip', 'w') as zip:
        zip.write(f'{data_dir}/charge_calculator/charges.txt', arcname=f'charges.txt')
        zip.write(f'{data_dir}/charge_calculator/{code}.cif', arcname=f'{code}.cif')
        zip.write(f'{data_dir}/structure_preparer/{code}_prepared.pdb', arcname=f'{code}.pdb')
    return send_from_directory(data_dir, f'{code}_charges.zip', as_attachment=True)


@application.route('/structure/<code>')
def get_structure(code: str):
    filepath = f'{root_dir}/calculated_structures/{code}/charge_calculator/{code}.cif'
    return Response(open(filepath, 'r').read(), mimetype='text/plain')


@application.errorhandler(404)
def page_not_found(error):
    return render_template('404.html'), 404
