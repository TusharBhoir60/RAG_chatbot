from typing import Optional, List, Dict, Any
from app.db.session import get_conn, init_db


def ensure_db():
    init_db()


def create_conversation(title: str = "New Chat") -> int:
    ensure_db()
    conn = get_conn()
    cur = conn.cursor()
    cur.execute("INSERT INTO conversations (title) VALUES (?)", (title,))
    conn.commit()
    conv_id = cur.lastrowid
    conn.close()
    return conv_id


def add_message(conversation_id: int, role: str, content: str) -> int:
    ensure_db()
    conn = get_conn()
    cur = conn.cursor()
    cur.execute(
        "INSERT INTO messages (conversation_id, role, content) VALUES (?, ?, ?)",
        (conversation_id, role, content),
    )
    conn.commit()
    msg_id = cur.lastrowid
    conn.close()
    return msg_id


def get_messages(conversation_id: int) -> List[Dict[str, Any]]:
    ensure_db()
    conn = get_conn()
    cur = conn.cursor()
    cur.execute(
        "SELECT role, content, created_at FROM messages WHERE conversation_id = ? ORDER BY id ASC",
        (conversation_id,),
    )
    rows = cur.fetchall()
    conn.close()
    return [dict(row) for row in rows]


def list_conversations() -> List[Dict[str, Any]]:
    ensure_db()
    conn = get_conn()
    cur = conn.cursor()
    cur.execute(
        """
        SELECT c.id, c.title, c.created_at,
               COUNT(m.id) AS message_count
        FROM conversations c
        LEFT JOIN messages m ON m.conversation_id = c.id
        GROUP BY c.id
        ORDER BY c.id DESC
        """
    )
    rows = cur.fetchall()
    conn.close()
    return [dict(row) for row in rows]


def delete_conversation(conversation_id: int) -> bool:
    ensure_db()
    conn = get_conn()
    cur = conn.cursor()

    cur.execute("DELETE FROM messages WHERE conversation_id = ?", (conversation_id,))
    cur.execute("DELETE FROM conversations WHERE id = ?", (conversation_id,))
    
    deleted = cur.rowcount > 0
    conn.commit()
    conn.close()
    return deleted    
