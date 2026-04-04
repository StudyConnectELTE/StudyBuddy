import os
import requests

def send_registration_email(to_email, name, temp_password):
    headers = {
        'accept': 'application/json',
        'api-key': os.getenv('BREVO_API_KEY'),
        'content-type': 'application/json'
    }

    html = f"""
        <html>
            <body>
                <h2>Sikeres regisztráció!</h2>
                <p>Ideiglenes jelszavad:</p>
                <h1>{temp_password}</h1>
            </body>
        </html>
    """

    return requests.post(
        "https://api.brevo.com/v3/smtp/email",
        headers=headers,
        json={
            'sender': {'name': 'StudyConnect', 'email': 'studyconnectnoreply@gmail.com'},
            'to': [{'email': to_email, 'name': name}],
            'subject': f'StudyConnect - Üdv, {name.split()[0]}!',
            'htmlContent': html
        }
    )
