"""SQLite helper + seed data for the sample app."""
import sqlite3

DB_PATH = "/tmp/twin.db"


def get_db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def init_db():
    conn = get_db()
    conn.executescript(
        """
        DROP TABLE IF EXISTS users;
        CREATE TABLE users (
            id INTEGER PRIMARY KEY,
            username TEXT,
            password TEXT,
            role TEXT
        );
        INSERT INTO users (username, password, role) VALUES
            ('alice', 'alicepass', 'user'),
            ('bob',   'bobpass',   'user'),
            ('admin', 'S3cureAdminPw!', 'admin');
        """
    )
    conn.commit()
    conn.close()


if __name__ == "__main__":
    init_db()
    print("seeded", DB_PATH)
