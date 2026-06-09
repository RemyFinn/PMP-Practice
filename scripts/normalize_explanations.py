from __future__ import annotations

import sys
from pathlib import Path

ROOT_DIR = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT_DIR))

from app.db import init_db, transaction
from app.utils import normalize_explanation_text


def normalize_existing_explanations() -> dict[str, int]:
    init_db()
    scanned = 0
    updated = 0
    with transaction() as conn:
        rows = conn.execute("SELECT id, explanation FROM questions").fetchall()
        for row in rows:
            scanned += 1
            explanation = row["explanation"] or ""
            normalized = normalize_explanation_text(explanation)
            if normalized == explanation:
                continue
            conn.execute(
                "UPDATE questions SET explanation = %s, updated_at = CURRENT_TIMESTAMP WHERE id = %s",
                (normalized, row["id"]),
            )
            updated += 1
    return {"scanned": scanned, "updated": updated}


if __name__ == "__main__":
    print(normalize_existing_explanations())
