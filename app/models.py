from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, Field


class OptionOut(BaseModel):
    id: int
    label: str
    text: str


class QuestionOut(BaseModel):
    id: int
    exam_code: str
    exam_title: str
    number: int
    stem: str
    is_multi: bool
    correct_answer: str
    explanation: str
    imported_user_answer: str = ""
    imported_judgement: str = ""
    imported_note: str = ""
    is_wrong_active: bool = False
    options: list[OptionOut]


class ExamOut(BaseModel):
    id: int
    code: str
    title: str
    total_questions: int
    wrong_questions: int
    attempts: int


class AttemptIn(BaseModel):
    question_id: int
    selected_options: list[str] = Field(default_factory=list)
    mode: str = "practice"
    elapsed_seconds: int | None = None


class AttemptOut(BaseModel):
    question_id: int
    selected_answer: str
    correct_answer: str
    is_correct: bool
    explanation: str
    is_wrong_active: bool
    elapsed_seconds: int | None = None


class WrongItemPatch(BaseModel):
    active: bool | None = None
    learned: bool | None = None
    source: str = "manual"


class OptionIn(BaseModel):
    label: str
    text: str


class QuestionCreate(BaseModel):
    exam_code: str
    number: int
    stem: str
    is_multi: bool = False
    correct_answer: str
    explanation: str = ""
    options: list[OptionIn]


class QuestionUpdate(BaseModel):
    exam_code: str | None = None
    number: int | None = None
    stem: str | None = None
    is_multi: bool | None = None
    correct_answer: str | None = None
    explanation: str | None = None
    imported_note: str | None = None
    options: list[OptionIn] | None = None


QuestionMode = Literal["exam", "mixed", "wrong", "admin"]
