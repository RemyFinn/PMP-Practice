from __future__ import annotations

import json
import os
import re
import urllib.request


BASE = os.environ.get("BASE_URL", "http://127.0.0.1:8000")


def req(path: str, method: str = "GET", data: dict | None = None):
    body = None if data is None else json.dumps(data).encode()
    request = urllib.request.Request(
        BASE + path,
        data=body,
        method=method,
        headers={"Content-Type": "application/json"},
    )
    with urllib.request.urlopen(request, timeout=10) as response:
        raw = response.read().decode()
        content_type = response.headers.get("Content-Type", "")
        return raw if "text/html" in content_type else json.loads(raw)


def answer_list(answer: str) -> list[str]:
    return re.findall(r"[A-F]", answer.split("/")[0])


def main() -> None:
    html = req("/")
    assert "PMP 做题系统" in html or "PMP 练习" in html

    exams = req("/api/exams")
    assert len(exams) == 4, len(exams)

    sim7 = req("/api/questions?mode=exam&exam=sim7")
    assert len(sim7) == 180, len(sim7)

    mixed = req("/api/questions?mode=mixed")
    assert len(mixed) == 720, len(mixed)

    wrong = req("/api/questions?mode=wrong")
    assert len(wrong) == 218, len(wrong)

    question = sim7[0]
    attempt = req(
        "/api/attempts",
        "POST",
        {
            "question_id": question["id"],
            "selected_options": answer_list(question["correct_answer"]),
            "mode": "verify",
        },
    )
    assert attempt["is_correct"] is True, attempt

    wrong_question = wrong[0]
    learned = req(
        f"/api/wrong-items/{wrong_question['id']}",
        "PATCH",
        {"learned": True},
    )
    assert learned["active"] is False, learned

    wrong_after = req("/api/questions?mode=wrong")
    assert len(wrong_after) == 217, len(wrong_after)

    created = req(
        "/api/questions",
        "POST",
        {
            "exam_code": "sim7",
            "number": 999,
            "stem": "临时验证题",
            "is_multi": False,
            "correct_answer": "A",
            "explanation": "验证解析",
            "options": [
                {"label": "A", "text": "正确"},
                {"label": "B", "text": "错误"},
            ],
        },
    )
    updated = req(
        f"/api/questions/{created['id']}",
        "PATCH",
        {
            "stem": "临时验证题更新",
            "correct_answer": "B",
            "options": [
                {"label": "A", "text": "旧"},
                {"label": "B", "text": "新正确"},
            ],
        },
    )
    assert updated["stem"] == "临时验证题更新"
    assert updated["correct_answer"] == "B"

    deleted = req(f"/api/questions/{created['id']}", "DELETE")
    assert deleted["deleted"] is True

    print(
        json.dumps(
            {
                "exams": len(exams),
                "sim7": len(sim7),
                "mixed": len(mixed),
                "wrong_before": len(wrong),
                "wrong_after_learned": len(wrong_after),
                "attempt_correct": attempt["is_correct"],
                "crud": "ok",
            },
            ensure_ascii=False,
        )
    )


if __name__ == "__main__":
    main()
