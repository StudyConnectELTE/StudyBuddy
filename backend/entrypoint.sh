#!/bin/bash
set -e

python /app/wait_for_db.py
exec flask run --host=0.0.0.0 --port=5000 --debug
