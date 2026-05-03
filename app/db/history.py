from __future__ import annotations

import logging
import sqlite3
from typing import Any, Dict, List, Optional

from app.db.session import get_conn, init_db

logger = logging.getLogger(__name__)


def ensure_db():
    init_db()


def create_conversation(title: str = "New Chat") -> int:
    ensure_db()
    try:
        conn = get_conn()
        cur = conn.cursor()
        cur.execute("INSERT INTO conversations (title) VALUES (?)", (title,))
        conn.commit()
        conv_id = cur.lastrowid
        conn.close()
    except sqlite3.Error:
        logger.exception("create_conversation failed title=%r", title)
        raise
    logger.info("db conversation created id=%s title=%r", conv_id, title)
    return conv_id


def add_message(conversation_id: int, role: str, content: str) -> int:
    ensure_db()
    try:
        conn = get_conn()
        cur = conn.cursor()
        cur.execute(
            "INSERT INTO messages (conversation_id, role, content) VALUES (?, ?, ?)",
            (conversation_id, role, content),
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


def get_messages(conversation_id: int, limit: Optional[int] = None) -> List[Dict[str, Any]]:
    ensure_db()
    try:
        conn = get_conn()
        cur = conn.cursor()
        if limit is not None and limit > 0:
            cur.execute(
                "SELECT role, content, created_at FROM messages WHERE conversation_id = ? ORDER BY id DESC LIMIT ?",
                (conversation_id, limit),
            )
            rows = cur.fetchall()
            rows.reverse()
        else:
            cur.execute(
                "SELECT role, content, created_at FROM messages WHERE conversation_id = ? ORDER BY id ASC",
                (conversation_id,),
            )
            rows = cur.fetchall()
        conn.close()
    except sqlite3.Error:
        logger.exception("get_messages failed conversation_id=%s", conversation_id)
        raise
    return [dict(row) for row in rows]


def list_conversations() -> List[Dict[str, Any]]:
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
            GROUP BY c.id
            ORDER BY c.id DESC
            """
        )
        rows = cur.fetchall()
        conn.close()
    except sqlite3.Error:
        logger.exception("list_conversations failed")
        raise
    return [dict(row) for row in rows]


def update_conversation_title(conversation_id: int, title: str) -> bool:
    ensure_db()
    try:
        conn = get_conn()
        cur = conn.cursor()
        cur.execute(
            "UPDATE conversations SET title = ? WHERE id = ?",
            (title, conversation_id),
        )
        updated = cur.rowcount > 0
        conn.commit()
        conn.close()
    except sqlite3.Error:
        logger.exception(
            "update_conversation_title failed conversation_id=%s", conversation_id
        )
        raise
    if updated:
        logger.info(
            "db conversation title updated id=%s title_len=%s",
            conversation_id,
            len(title),
        )
    return updated


def delete_conversation(conversation_id: int) -> bool:
    ensure_db()
    try:
        conn = get_conn()
        cur = conn.cursor()

        cur.execute("DELETE FROM messages WHERE conversation_id = ?", (conversation_id,))
        cur.execute("DELETE FROM conversations WHERE id = ?", (conversation_id,))

        deleted = cur.rowcount > 0
        conn.commit()
        conn.close()
    except sqlite3.Error:
        logger.exception("delete_conversation failed conversation_id=%s", conversation_id)
        raise
    if deleted:
        logger.info("db conversation deleted id=%s", conversation_id)
    return deleted
