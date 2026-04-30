import sqlite3
from pathlib import Path
from typing import List, Dict, Any, Optional
import uuid

# SQLite database file path
BASE_DIR = Path(__file__).resolve().parents[2]
DB_DIR = BASE_DIR / "data" / "db"
DB_PATH = DB_DIR / "history.db"


def ensure_db():
    """Ensure the database and directory exist, and setup tables."""
    DB_DIR.mkdir(parents=True, exist_ok=True)
    
    with sqlite3.connect(DB_PATH) as conn:
        cursor = conn.cursor()
        # Create conversations table
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS conversations (
                id TEXT PRIMARY KEY,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        ''')
        # Create messages table
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS messages (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                conversation_id TEXT NOT NULL,
                role TEXT NOT NULL,
                content TEXT NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY(conversation_id) REFERENCES conversations(id)
            )
        ''')
        conn.commit()


def create_conversation(title: str = "New Chat") -> str:
    """Create a new conversation and return its ID."""
    conv_id = str(uuid.uuid4())
    with sqlite3.connect(DB_PATH) as conn:
        cursor = conn.cursor()
        cursor.execute(
            'INSERT INTO conversations (id) VALUES (?)',
            (conv_id,)
        )
        conn.commit()
    return conv_id


def add_message(conversation_id: str, role: str, content: str):
    """Add a message to a conversation."""
    with sqlite3.connect(DB_PATH) as conn:
        cursor = conn.cursor()
        cursor.execute(
            'INSERT INTO messages (conversation_id, role, content) VALUES (?, ?, ?)',
            (conversation_id, role, content)
        )
        conn.commit()


def get_messages(conversation_id: str) -> List[Dict[str, Any]]:
    """Retrieve all messages for a given conversation."""
    with sqlite3.connect(DB_PATH) as conn:
        conn.row_factory = sqlite3.Row  # Return dict-like rows
        cursor = conn.cursor()
        cursor.execute(
            'SELECT role, content, created_at FROM messages WHERE conversation_id = ? ORDER BY created_at ASC, id ASC',
            (conversation_id,)
        )
        rows = cursor.fetchall()
        
    return [{"role": row["role"], "content": row["content"], "created_at": row["created_at"]} for row in rows]
