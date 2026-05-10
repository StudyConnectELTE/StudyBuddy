import os
import requests

def send_registration_email(to_email, name, temp_pw):
    try:
        headers = {
            'accept': 'application/json',
            'Api-Key': os.getenv('BREVO_API_KEY'),
            'content-type': 'application/json'
        }

        response = requests.post(
            "https://api.brevo.com/v3/smtp/email",
            headers=headers,
            json={
                'sender': {
                    'name': 'StudyConnect',
                    'email': 'studyconnectnoreply@gmail.com'
                },
                'to': [{'email': to_email, 'name': name}],
                'subject': '🎓 StudyConnect – Regisztrációs jelszó',
                'htmlContent': f"""
                    <html>
                    <body>
                        <h2>Üdv, {name}!</h2>
                        <p>Az ideiglenes jelszavad:</p>
                        <h1>{temp_pw}</h1>
                        <p>Belépés után kérjük, változtasd meg.</p>
                    </body>
                    </html>
                """
            }
        )

        print(f"REG BREVO: {response.status_code} → {to_email}")
        if response.status_code not in [201, 202]:
            print("REG BREVO ERROR:", response.text)

    except Exception as e:
        print("REG EMAIL EXCEPTION:", e)
