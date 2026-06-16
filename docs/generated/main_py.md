# main.py

This file contains the backend logic for the poem AI agent, including database initialization, API endpoints for poem generation, revision, continuation, response, analysis, and saving, as well as utility functions for interacting with the language model and database.

## _db_init

```python
def _db_init():
    conn = sqlite3.connect(DB_PATH)
    conn.execute("""
        CREATE TABLE IF NOT EXISTS poems (
            id         INTEGER PRIMARY KEY AUTOINCREMENT,
            poem       TEXT    NOT NULL,
            title      TEXT    DEFAULT '',
            theme      TEXT    DEFAULT '',
            mood       TEXT    DEFAULT '',
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    """)
    conn.commit()
    conn.close()
```

Initializes the SQLite database, creating the `poems` table if it does not already exist. The `poems` table stores poem content, title, theme, mood, and creation timestamp.
