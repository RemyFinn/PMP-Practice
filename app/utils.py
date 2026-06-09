from __future__ import annotations

import re
from collections.abc import Iterable


def normalize_answer(value: str | Iterable[str]) -> str:
    if isinstance(value, str):
        letters = re.findall(r"[A-F]", value.upper())
    else:
        letters = []
        for item in value:
            letters.extend(re.findall(r"[A-F]", str(item).upper()))
    return "、".join(sorted(set(letters)))


def normalize_correct_answer(value: object) -> str:
    text = "" if value is None else str(value)
    text = text.upper().replace("，", "、").replace(",", "、")
    if "/" in text:
        parts = []
        for part in text.split("/"):
            answer = normalize_answer(part)
            if answer:
                parts.append(answer)
        return "/".join(parts)
    return normalize_answer(text)


STRUCTURAL_EXPLANATION_LINE_RE = re.compile(
    r"^\s*(?:[-*•]\s+|\d+[.)、]\s+|[A-F][.)、]\s+|[（(]?[一二三四五六七八九十]+[）)、]\s+)"
)


def is_structural_explanation_line(line: str) -> bool:
    return bool(STRUCTURAL_EXPLANATION_LINE_RE.search(line))


def should_remove_explanation_newline(previous_line: str, next_line: str) -> bool:
    previous = previous_line.strip()
    next_value = next_line.strip()
    if not previous or not next_value:
        return False
    if is_structural_explanation_line(previous_line) or is_structural_explanation_line(next_line):
        return False
    if re.search(r"[:：。！？!?；;]\s*$", previous):
        return False
    if re.search(r"[:：]\s*$", next_value):
        return False
    return True


def normalize_explanation_text(value: object) -> str:
    text = "" if value is None else str(value)
    parts = re.split(r"(\r\n|\r|\n)", text)
    normalized: list[str] = []
    for index in range(0, len(parts), 2):
        line = parts[index]
        normalized.append(line)
        if index + 1 >= len(parts):
            continue
        separator = parts[index + 1]
        next_line = parts[index + 2] if index + 2 < len(parts) else ""
        if not should_remove_explanation_newline(line, next_line):
            normalized.append(separator)
    return "".join(normalized)


def answer_sets(correct_answer: str) -> list[set[str]]:
    sets: list[set[str]] = []
    for part in correct_answer.upper().split("/"):
        letters = set(re.findall(r"[A-F]", part))
        if letters:
            sets.append(letters)
    return sets or [set()]


def is_answer_correct(selected_answer: str, correct_answer: str) -> bool:
    selected = set(re.findall(r"[A-F]", selected_answer.upper()))
    return any(selected == expected for expected in answer_sets(correct_answer))
