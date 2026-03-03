#!/bin/sh

# 1. Exit immediately if a command fails
set -e

echo "Running Collectstatic..."
python manage.py collectstatic --noinput

echo "Applying Migrations..."
# Note: In a real production scale-out, you might want to run 
# migrations separately, but for a single app instance, this is fine.
python manage.py migrate --noinput

echo "Starting Gunicorn..."
# Change 8000 to 8080 to match DigitalOcean's default
# Added --access-log - so you can see requests in the DO console
exec python -m gunicorn --bind 0.0.0.0:8080 --workers 3 --access-logfile - core.wsgi:application