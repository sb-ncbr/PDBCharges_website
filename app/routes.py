import json
import os
import zipfile
from random import random
from time import sleep, time

from flask import render_template, flash, request, send_from_directory, redirect, url_for, Response, Flask, Markup, jsonify

application = Flask(__name__)
application.jinja_env.trim_blocks = True
application.jinja_env.lstrip_blocks = True
application.config['SECRET_KEY'] = str(random())
root_dir = os.path.dirname(os.path.abspath(__file__))



@application.route('/', methods=['GET', 'POST'])
def main_site():
    if request.method == 'POST':
        code = request.form['code'].strip().lower() # todo na lower
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

    absolute_charges = []
    for charge in open(f'{data_dir}/charge_calculator/charges.txt', 'r').readlines()[1].split():
        try:
            absolute_charges.append(abs(float(charge)))
        except ValueError: # value is "?"
            continue
    chg_range = round(max(absolute_charges), 4)
    n_ats = len(absolute_charges)
    return render_template('results.html',
                           code=code,
                           chg_range=chg_range,
                           n_ats=n_ats)



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
