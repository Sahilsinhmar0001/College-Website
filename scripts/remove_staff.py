import sqlite3
DB = 'college.db'

con = sqlite3.connect(DB)
cur = con.cursor()
cur.execute("SELECT COUNT(*) FROM users WHERE role='staff'")
n = cur.fetchone()[0]
if n > 0:
    cur.execute("DELETE FROM users WHERE role='staff'")
    con.commit()
    print(f"Deleted {n} user(s) with role 'staff'.")
else:
    print("No users with role 'staff' found.")

print('\nRemaining users:')
for row in cur.execute('SELECT id, username, role FROM users ORDER BY id'):
    print(row)

cur.execute('VACUUM')
con.close()
