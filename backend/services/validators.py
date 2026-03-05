import re

def validate_secondary_email(primary_email, secondary_email):
    email_regex = re.compile(r'^[^\s@]+@[^\s@]+\.[^\s@]+$')

    if not email_regex.match(secondary_email):
        return False, "Érvénytelen email formátum"
    if secondary_email.lower() == primary_email.lower():
        return False, "Másodlagos NEM lehet ELTE cím!"
    if 'inf.elte.hu' in secondary_email.lower() or 'student.elte.hu' in secondary_email.lower():
        return False, "Másodlagos legyen Gmail/Proton!"
    return True, "OK"
