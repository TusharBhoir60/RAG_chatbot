from __future__ import annotations

import logging
import sqlite3
from typing import Any, Dict, List, Optional

from app.db.session import get_conn, init_db

logger = logging.getLogger(__name__)


def ensure_db():
    init_db()


def increment_user_queries(user_id: str) -> None:
    ensure_db()
    try:
        conn = get_conn()
        cur = conn.cursor()
        cur.execute(
            "INSERT INTO user_stats (user_id, queries_count) VALUES (?, 1) "
            "ON CONFLICT(user_id) DO UPDATE SET queries_count = queries_count + 1",
            (user_id,)
        )
        conn.commit()
        conn.close()
    except sqlite3.Error:
        logger.exception("increment_user_queries failed user_id=%s", user_id)

def create_conversation(user_id: str, title: str = "New Chat") -> int:
    ensure_db()
    try:
        conn = get_conn()
        cur = conn.cursor()
        cur.execute("INSERT INTO conversations (user_id, title) VALUES (?, ?)", (user_id, title))
        conn.commit()
        conv_id = cur.lastrowid
        conn.close()
    except sqlite3.Error:
        logger.exception("create_conversation failed title=%r", title)
        raise
    logger.info("db conversation created id=%s title=%r user_id=%s", conv_id, title, user_id)
    return conv_id


def add_message(conversation_id: int, user_id: str, role: str, content: str) -> int:
    ensure_db()
    try:
        conn = get_conn()
        cur = conn.cursor()
        cur.execute(
            "INSERT INTO messages (conversation_id, user_id, role, content) VALUES (?, ?, ?, ?)",
            (conversation_id, user_id, role, content),
        )
        conn.commit()
        msg_id = cur.lastrowid
        conn.close()
    except sqlite3.Error:
        logger.exception(
            "add_message failed conversation_id=%s role=%s", conversation_id, role
        )
        raise
    logger.info(
        "db message added id=%s conversation_id=%s role=%s content_len=%s",
        msg_id,
        conversation_id,
        role,
        len(content),
    )
    return msg_id


def get_messages(conversation_id: int, user_id: str, limit: Optional[int] = None) -> List[Dict[str, Any]]:
    ensure_db()
    try:
        conn = get_conn()
        cur = conn.cursor()
        if limit is not None and limit > 0:
            cur.execute(
                "SELECT role, content, created_at FROM messages WHERE conversation_id = ? AND user_id = ? ORDER BY id DESC LIMIT ?",
                (conversation_id, user_id, limit),
            )
            rows = cur.fetchall()
            rows.reverse()
        else:
            cur.execute(
                "SELECT role, content, created_at FROM messages WHERE conversation_id = ? AND user_id = ? ORDER BY id ASC",
                (conversation_id, user_id),
            )
            rows = cur.fetchall()
        conn.close()
    except sqlite3.Error:
        logger.exception("get_messages failed conversation_id=%s", conversation_id)
        raise
    return [dict(row) for row in rows]


def list_conversations(user_id: str) -> List[Dict[str, Any]]:
    ensure_db()
    try:
        conn = get_conn()
        cur = conn.cursor()
        cur.execute(
            """
            SELECT c.id, c.title, c.created_at,
                   COUNT(m.id) AS message_count
            FROM conversations c
            LEFT JOIN messages m ON m.conversation_id = c.id
            WHERE c.user_id = ?
            GROUP BY c.id
            ORDER BY c.id DESC
            """,
            (user_id,)
        )
        rows = cur.fetchall()
        conn.close()
    except sqlite3.Error:
        logger.exception("list_conversations failed")
        raise
    return [dict(row) for row in rows]


def update_conversation_title(conversation_id: int, user_id: str, title: str) -> bool:
    ensure_db()
    try:
        conn = get_conn()
        cur = conn.cursor()
        cur.execute(
            "UPDATE conversations SET title = ? WHERE id = ? AND user_id = ?",
            (title, conversation_id, user_id),
        )
        updated = cur.rowcount > 0
        conn.commit()
        conn.close()
    except sqlite3.Error:
        logger.exception(
            "update_conversation_title failed conversation_id=%s user_id=%s", conversation_id, user_id
        )
        raise
    if updated:
        logger.info(
            "db conversation title updated id=%s title_len=%s",
            conversation_id,
            len(title),
        )
    return updated


def delete_conversation(conversation_id: int, user_id: str) -> bool:
    ensure_db()
    try:
        conn = get_conn()
        cur = conn.cursor()
        
        # Verify ownership before deleting messages
        cur.execute("SELECT id FROM conversations WHERE id = ? AND user_id = ?", (conversation_id, user_id))
        if not cur.fetchone():
            return False

        cur.execute("DELETE FROM messages WHERE conversation_id = ?", (conversation_id,))
        cur.execute("DELETE FROM conversations WHERE id = ? AND user_id = ?", (conversation_id, user_id))

        deleted = cur.rowcount > 0
        conn.commit()
        conn.close()
    except sqlite3.Error:
        logger.exception("delete_conversation failed conversation_id=%s user_id=%s", conversation_id, user_id)
        raise
    if deleted:
        logger.info("db conversation deleted id=%s", conversation_id)
    return deleted
