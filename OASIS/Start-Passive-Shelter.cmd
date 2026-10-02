@echo off
setlocal
cd /d "%~dp0"
echo Starting Passive Shelter Designer at http://localhost:8080
echo Keep this window open while using the website. Press Ctrl+C to stop it.
python serve_shelter.py
