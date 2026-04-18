import os
import sqlite3
from functools import wraps
from flask import Flask, render_template, request, redirect, url_for, session, g, flash
from werkzeug.security import generate_password_hash, check_password_hash

DB_PATH = os.environ.get("DATABASE_PATH", "college.db")

def get_db():
    db = getattr(g, "_database", None)
    if db is None:
        db = g._database = sqlite3.connect(DB_PATH)
        db.row_factory = sqlite3.Row
    return db

def init_db():
    db = sqlite3.connect(DB_PATH)
    cur = db.cursor()
    cur.execute("""
    CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        role TEXT NOT NULL
    )
    """)
    # Insert sample users if they don't exist
    users = [
        ("student", generate_password_hash("studentpass"), "student"),
        ("teacher", generate_password_hash("teacherpass"), "teacher"),
    ]
    for u, p, r in users:
        try:
            cur.execute("INSERT INTO users (username, password, role) VALUES (?, ?, ?)", (u, p, r))
        except sqlite3.IntegrityError:
            pass
    db.commit()
    db.close()

def create_user(username, password, role="student"):
    db = get_db()
    hashed = generate_password_hash(password)
    db.execute("INSERT INTO users (username, password, role) VALUES (?, ?, ?)", (username, hashed, role))
    db.commit()

def login_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        if not g.user:
            flash("Please log in.", "warning")
            return redirect(url_for("login"))
        return f(*args, **kwargs)
    return decorated

def roles_required(*roles):
    def decorator(f):
        @wraps(f)
        def decorated(*args, **kwargs):
            if not g.user:
                flash("Please log in.", "warning")
                return redirect(url_for("login"))
            if g.user["role"] not in roles:
                flash("Access denied.", "error")
                return redirect(url_for("index"))
            return f(*args, **kwargs)
        return decorated
    return decorator

app = Flask(__name__)
app.secret_key = os.environ.get("SECRET_KEY", "dev-secret-key")

@app.teardown_appcontext
def close_connection(exception):
    db = getattr(g, "_database", None)
    if db is not None:
        db.close()

@app.before_request
def load_current_user():
    user = None
    if "user_id" in session:
        db = get_db()
        cur = db.execute("SELECT id, username, role FROM users WHERE id = ?", (session["user_id"],))
        row = cur.fetchone()
        if row:
            # convert sqlite3.Row to plain dict for templates and safer handling
            user = {k: row[k] for k in row.keys()}
    g.user = user

@app.route("/")
def index():
    return render_template("index.html")

@app.route("/about")
def about():
    return render_template("about.html")

@app.route("/courses")
def courses():
    return render_template("courses.html")

@app.route("/admissions", methods=["GET", "POST"])
def admissions():
    if request.method == "POST":
        flash("Application submitted. Check your email for status updates.", "success")
    return render_template("admissions.html")

@app.route("/placements")
def placements():
    return render_template("placements.html")

@app.route("/faculty")
def faculty():
    return render_template("faculty.html")

@app.route("/campus")
def campus():
    return render_template("campus.html")

@app.route("/news")
def news():
    return render_template("news.html")

@app.route("/contact", methods=["GET", "POST"])
def contact():
    if request.method == "POST":
        flash("Thank you! We'll get back to you soon.", "success")
    return render_template("contact.html")


@app.route("/login", methods=["GET", "POST"])
def login():
    if request.method == "POST":
        username = request.form.get("username")
        password = request.form.get("password")
        portal = request.form.get("portal")  # expected 'student' or 'teacher' (optional)
        db = get_db()
        cur = db.execute("SELECT id, username, password, role FROM users WHERE username = ?", (username,))
        user = cur.fetchone()
        if user and check_password_hash(user["password"], password):
            # If a portal was selected, ensure the user's role matches the portal
            if portal and user["role"] != portal:
                flash(f"Please sign in using the {user['role'].title()} portal.", "warning")
                return redirect(url_for("login", portal=user["role"]))
            session["user_id"] = user["id"]
            flash("Logged in successfully.", "success")
            return redirect(url_for("dashboard"))
        # On invalid credentials, use PRG to avoid form-resubmission on refresh
        flash("Invalid username or password", "error")
        # preserve chosen portal if present
        if portal:
            return redirect(url_for("login", portal=portal))
        return redirect(url_for("login"))
    # GET: redirect to home with portal query so the modal UI (in base) opens consistently
    portal_q = request.args.get('portal')
    if portal_q:
        return redirect(url_for('index', portal=portal_q))
    return redirect(url_for('index'))


@app.route("/register", methods=["GET", "POST"])
def register():
    # Registration disabled in production/demo. Redirect to home with message.
    flash("Registration is disabled. Contact admin to create accounts.", "info")
    return redirect(url_for('index'))

@app.route("/logout")
def logout():
    session.clear()
    flash("You have been logged out.", "info")
    return redirect(url_for("index"))

@app.route("/dashboard")
@login_required
def dashboard():
    role = g.user["role"]
    return render_template("dashboard.html", user=g.user, role=role)


@app.route("/admin")
@roles_required("teacher")
def admin_panel():
    db = get_db()
    cur = db.execute("SELECT id, username, role FROM users ORDER BY id")
    users = cur.fetchall()
    return render_template("admin.html", users=users)


@app.route("/admin/create_user", methods=["POST"])
@roles_required("teacher")
def admin_create_user():
    username = request.form.get("username")
    password = request.form.get("password")
    role = request.form.get("role") or "student"
    try:
        create_user(username, password, role)
        flash("User created.", "success")
    except sqlite3.IntegrityError:
        flash("Username already exists.", "error")
    return redirect(url_for("admin_panel"))

if __name__ == "__main__":
    if not os.path.exists(DB_PATH):
        init_db()
    # Use flask built-in server only for development
    app.run(debug=True, host='0.0.0.0', port=int(os.environ.get("PORT", 5000)))

# Configure logging for production when not in debug
if not app.debug:
    import logging
    from logging.handlers import RotatingFileHandler
    if not os.path.exists('logs'):
        os.makedirs('logs')
    file_handler = RotatingFileHandler('logs/college.log', maxBytes=10240, backupCount=5)
    file_handler.setLevel(logging.INFO)
    formatter = logging.Formatter('%(asctime)s %(levelname)s: %(message)s [in %(pathname)s:%(lineno)d]')
    file_handler.setFormatter(formatter)
    app.logger.addHandler(file_handler)
    app.logger.setLevel(logging.INFO)
    app.logger.info('College app startup')
