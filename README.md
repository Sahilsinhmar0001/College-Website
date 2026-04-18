# College Website (Flask)

Simple college website scaffold with role-based login for `student` and `teacher`, plus public pages.

Default sample users (created on first run):
- student / studentpass
- teacher / teacherpass
 

Setup (Windows, development):

```powershell
python -m venv venv
.\venv\Scripts\Activate.ps1
pip install -r requirements.txt
python app.py
```

Open http://127.0.0.1:5000 in your browser.

Production options:

- Run with Waitress (Windows-friendly WSGI server):

```powershell
.\venv\Scripts\Activate.ps1
pip install -r requirements.txt
python run_prod.py
```

- Run in Docker (recommended for Linux/container deployment):

```powershell
docker build -t college-app .
docker run -p 8000:8000 --env-file .env.example -d college-app
```

Notes:
- Set `SECRET_KEY` and `DATABASE_PATH` via environment variables (see `.env.example`).
- The app creates `college.db` automatically if not present. For production consider a real RDBMS.
- Logs are written to `logs/college.log` when running outside debug mode.
