from typing import List, Optional
import psycopg2
from models.chat import ChatMessageRead

class ChatRepository:
    def __init__(self, conn: psycopg2.extensions.connection):
        self.conn = conn

    def create_message(self, sender_id: int, receiver_id: int, message: str) -> dict:
        with self.conn.cursor() as cur:
            cur.execute(
                """
                INSERT INTO chat_messages (sender_id, receiver_id, message)
                VALUES (%s, %s, %s)
                RETURNING id, sender_id, receiver_id, message, is_read, created_at
                """,
                (sender_id, receiver_id, message)
            )
            return cur.fetchone()

    def get_messages(self, user_id1: int, user_id2: int, limit: int = 50, offset: int = 0) -> List[dict]:
        with self.conn.cursor() as cur:
            cur.execute(
                """
                SELECT id, sender_id, receiver_id, message, is_read, created_at
                FROM chat_messages
                WHERE (sender_id = %s AND receiver_id = %s)
                   OR (sender_id = %s AND receiver_id = %s)
                ORDER BY created_at ASC
                LIMIT %s OFFSET %s
                """,
                (user_id1, user_id2, user_id2, user_id1, limit, offset)
            )
            return cur.fetchall()

    def mark_as_read(self, receiver_id: int, sender_id: int):
        with self.conn.cursor() as cur:
            cur.execute(
                """
                UPDATE chat_messages
                SET is_read = TRUE
                WHERE receiver_id = %s AND sender_id = %s AND is_read = FALSE
                """,
                (receiver_id, sender_id)
            )

    def get_conversations(self, user_id: int) -> List[dict]:
        with self.conn.cursor() as cur:
            cur.execute(
                """
                WITH LastMessages AS (
                    SELECT 
                        CASE WHEN sender_id = %s THEN receiver_id ELSE sender_id END as other_user_id,
                        message,
                        created_at,
                        ROW_NUMBER() OVER (
                            PARTITION BY CASE WHEN sender_id = %s THEN receiver_id ELSE sender_id END 
                            ORDER BY created_at DESC
                        ) as rn
                    FROM chat_messages
                    WHERE sender_id = %s OR receiver_id = %s
                ),
                UnreadCounts AS (
                    SELECT sender_id, COUNT(*) as count
                    FROM chat_messages
                    WHERE receiver_id = %s AND is_read = FALSE
                    GROUP BY sender_id
                )
                SELECT 
                    u.id as other_user_id,
                    u.name as other_user_name,
                    u.avatar_url as other_user_avatar,
                    lm.message as last_message,
                    lm.created_at as last_message_at,
                    COALESCE(uc.count, 0) as unread_count
                FROM LastMessages lm
                JOIN users u ON u.id = lm.other_user_id
                LEFT JOIN UnreadCounts uc ON uc.sender_id = u.id
                WHERE lm.rn = 1
                ORDER BY lm.created_at DESC
                """,
                (user_id, user_id, user_id, user_id, user_id)
            )
            return cur.fetchall()

    def clear_conversation(self, user_id1: int, user_id2: int):
        with self.conn.cursor() as cur:
            cur.execute(
                """
                DELETE FROM chat_messages
                WHERE (sender_id = %s AND receiver_id = %s)
                   OR (sender_id = %s AND receiver_id = %s)
                """,
                (user_id1, user_id2, user_id2, user_id1)
            )

