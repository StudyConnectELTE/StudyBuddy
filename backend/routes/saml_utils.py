import os
import json
from onelogin.saml2.auth import OneLogin_Saml2_Auth
from flask import request

def prepare_flask_request(req):
    url_data = req.host_url
    return {
        'https': 'on' if req.is_secure else 'off',
        'http_host': req.host,
        'server_port': req.environ.get('SERVER_PORT'),
        'script_name': req.path,
        'get_data': req.args.copy(),
        'post_data': req.form.copy()
    }

def _load_pem_file(pem_value, saml_path):
    if not isinstance(pem_value, str):
        return pem_value

    candidate_path = os.path.join(saml_path, pem_value)
    if os.path.exists(candidate_path):
        with open(candidate_path, 'r') as pem_file:
            pem_text = pem_file.read().strip()
            lines = [line for line in pem_text.splitlines() if not line.startswith('-----')]
            return ''.join(lines)

    return pem_value


def load_saml_settings():
    saml_path = os.path.join(os.path.dirname(__file__), '')
    settings_file_path = os.path.join(saml_path, 'saml_settings.json')

    with open(settings_file_path, 'r') as f:
        settings_dict = json.load(f)

    if 'sp' in settings_dict:
        settings_dict['sp']['x509cert'] = _load_pem_file(settings_dict['sp'].get('x509cert'), saml_path)
        settings_dict['sp']['privateKey'] = _load_pem_file(settings_dict['sp'].get('privateKey'), saml_path)

    return settings_dict


def init_saml_auth(req):
    from onelogin.saml2.settings import OneLogin_Saml2_Settings
    settings_dict = load_saml_settings()
    saml_path = os.path.join(os.path.dirname(__file__), '')
    settings = OneLogin_Saml2_Settings(settings_dict, custom_base_path=saml_path)
    return OneLogin_Saml2_Auth(req, old_settings=settings)
