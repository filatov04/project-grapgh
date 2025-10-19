import asyncpg
import logging
from typing import Optional, Dict, Any
from datetime import datetime
from dependency_injector import wiring
from fastapi import Depends

from dependencies.config import Config

logger = logging.getLogger(__name__)


class VersionDAO:
    """DAO для работы с версионированием узлов графа"""

    @classmethod
    @wiring.inject
    async def get_node_version(
        cls,
        node_uri: str,
        db_pool: asyncpg.Pool = Depends(wiring.Provide["db_pool"]),
    ) -> Optional[Dict[str, Any]]:
        """Получить текущую версию узла"""
        try:
            row = await db_pool.fetchrow(
                """
                SELECT node_uri, version, last_modified
                FROM node_version
                WHERE node_uri = $1
                """,
                node_uri
            )
            if row:
                return {
                    "node_uri": row["node_uri"],
                    "version": row["version"],
                    "last_modified": row["last_modified"].isoformat()
                }
            return None
        except Exception as e:
            logger.error(f"Error getting node version: {e}")
            raise

    @classmethod
    @wiring.inject
    async def create_or_update_version(
        cls,
        node_uri: str,
        user_id: int,
        change_type: str,  # CREATE, UPDATE, DELETE
        old_value: Optional[Dict] = None,
        new_value: Optional[Dict] = None,
        db_pool: asyncpg.Pool = Depends(wiring.Provide["db_pool"]),
    ) -> int:
        """
        Создать или обновить версию узла и записать в историю
        Возвращает новую версию
        """
        try:
            async with db_pool.acquire() as conn:
                async with conn.transaction():
                    # Получаем текущую версию или создаём новую запись
                    row = await conn.fetchrow(
                        """
                        INSERT INTO node_version (node_uri, version, last_modified)
                        VALUES ($1, 1, CURRENT_TIMESTAMP)
                        ON CONFLICT (node_uri)
                        DO UPDATE SET
                            version = node_version.version + 1,
                            last_modified = CURRENT_TIMESTAMP
                        RETURNING version
                        """,
                        node_uri
                    )
                    new_version = row["version"]

                    # Записываем в историю
                    await conn.execute(
                        """
                        INSERT INTO node_change_history
                        (node_uri, user_id, change_type, old_value, new_value, version, changed_at)
                        VALUES ($1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP)
                        """,
                        node_uri,
                        user_id,
                        change_type,
                        old_value,
                        new_value,
                        new_version
                    )

                    logger.info(f"Updated version for {node_uri}: v{new_version}")
                    return new_version

        except Exception as e:
            logger.error(f"Error updating node version: {e}")
            raise

    @classmethod
    @wiring.inject
    async def get_node_history(
        cls,
        node_uri: str,
        limit: int = 10,
        db_pool: asyncpg.Pool = Depends(wiring.Provide["db_pool"]),
    ) -> list[Dict[str, Any]]:
        """Получить историю изменений узла"""
        try:
            rows = await db_pool.fetch(
                """
                SELECT
                    id,
                    node_uri,
                    user_id,
                    change_type,
                    old_value,
                    new_value,
                    version,
                    changed_at
                FROM node_change_history
                WHERE node_uri = $1
                ORDER BY changed_at DESC
                LIMIT $2
                """,
                node_uri,
                limit
            )
            return [
                {
                    "id": row["id"],
                    "node_uri": row["node_uri"],
                    "user_id": row["user_id"],
                    "change_type": row["change_type"],
                    "old_value": row["old_value"],
                    "new_value": row["new_value"],
                    "version": row["version"],
                    "changed_at": row["changed_at"].isoformat()
                }
                for row in rows
            ]
        except Exception as e:
            logger.error(f"Error getting node history: {e}")
            raise

    @classmethod
    @wiring.inject
    async def check_version_conflict(
        cls,
        node_uri: str,
        expected_version: int,
        db_pool: asyncpg.Pool = Depends(wiring.Provide["db_pool"]),
    ) -> bool:
        """
        Проверить конфликт версий
        Возвращает True, если версия совпадает (нет конфликта)
        """
        try:
            row = await db_pool.fetchrow(
                """
                SELECT version
                FROM node_version
                WHERE node_uri = $1
                """,
                node_uri
            )
            if row is None:
                # Узла нет в БД - нет конфликта
                return True

            current_version = row["version"]
            return current_version == expected_version

        except Exception as e:
            logger.error(f"Error checking version conflict: {e}")
            raise
