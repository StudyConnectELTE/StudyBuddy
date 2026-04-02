import os
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

def init_saml_auth(req):
    from onelogin.saml2.settings import OneLogin_Saml2_Settings
    saml_path = os.path.join(os.path.dirname(__file__), '')
    settings = OneLogin_Saml2_Settings(
        settings_file=os.path.join(saml_path, 'saml_settings.json'),
        custom_base_path=saml_path
    )
    return OneLogin_Saml2_Auth(req, old_settings=settings)
