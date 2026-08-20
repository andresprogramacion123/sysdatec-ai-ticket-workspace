#!/usr/bin/env bash
set -e

echo "Waiting for Postgres to be available..."
python -m app.pre_start

echo "Starting Uvicorn..."
exec uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
