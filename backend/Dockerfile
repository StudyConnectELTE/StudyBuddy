FROM python:3.11-slim

WORKDIR /app

# requirements.txt másolása ÉS telepítése
COPY requirements.txt .
RUN pip install -r requirements.txt

# Kód másolása
COPY . .

EXPOSE 5000

CMD ["python", "app.py"]