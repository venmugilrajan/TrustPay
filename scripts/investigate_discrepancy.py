import sqlite3

def investigate():
    conn = sqlite3.connect('trustpay.db')
    c = conn.cursor()
    job_id = '2dd4fbb8-098a-4047-8efe-48322c6de334'
    print('=== JOB ===')
    for r in c.execute("SELECT id, title, status, max_budget, paypal_authorization_id FROM jobs WHERE id=?", (job_id,)):
        print(r)
    print('=== CONTRACTS ===')
    for r in c.execute("SELECT id, total_amount, status FROM contracts WHERE job_id=?", (job_id,)):
        print(r)
    print('=== APPLICATIONS ===')
    for r in c.execute("SELECT id, preferred_price, min_price, status FROM applications WHERE job_id=?", (job_id,)):
        print(r)
    print('=== LEDGER ===')
    for r in c.execute("SELECT type, amount, paypal_id, is_demo FROM payments_ledger WHERE job_id=?", (job_id,)):
        print(r)

if __name__ == '__main__':
    investigate()

