import sqlite3

def fix_statuses():
    conn = sqlite3.connect('trustpay.db')
    c = conn.cursor()
    c.execute("UPDATE applications SET status = 'completed' WHERE job_id = '4e89e06c-fb72-4ec4-b3ec-288dd756d1ef'")
    c.execute("UPDATE applications SET status = 'disputed' WHERE job_id = '8ee0e18b-e494-4a76-b291-83270f1a5f47'")
    c.execute("UPDATE applications SET status = 'completed' WHERE id = '824007b0-39b0-4c55-a5a1-555a888f79d1'")
    c.execute("DELETE FROM applications WHERE id = 'f6f56dee-9c0a-43c9-8eb0-c5ff4ab76a73'")
    conn.commit()
    print("Database applications updated successfully.")

if __name__ == "__main__":
    fix_statuses()

