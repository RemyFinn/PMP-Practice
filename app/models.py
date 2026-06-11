from __future__ import annotations

from typing import Any
from typing import Literal

from pydantic import BaseModel, Field


class UserOut(BaseModel):
    id: int
    username: str
    display_name: str = ""
    role: str
    is_active: bool = True


class LoginIn(BaseModel):
    username: str
    password: str


class UserCreate(BaseModel):
    username: str = Field(min_length=2)
    display_name: str = ""
    password: str = Field(min_length=6)
    role: str = "user"


class UserUpdate(BaseModel):
    display_name: str | None = None
    password: str | None = Field(default=None, min_length=6)
    role: str | None = None
    is_active: bool | None = None


class OptionOut(BaseModel):
    id: int
    label: str
    text: str


class StrategyLinkOut(BaseModel):
    id: int
    exam_code: str
    category: str
    title: str
    summary: str = ""


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
    wrong_count: int = 0
    attempt_count: int = 0
    last_wrong_at: str | None = None
    strategies: list[StrategyLinkOut] = Field(default_factory=list)
    options: list[OptionOut]


class StrategyQuestionOut(BaseModel):
    id: int
    exam_code: str
    number: int
    stem: str
    is_wrong_active: bool = False


class StrategyOut(BaseModel):
    id: int
    exam_code: str
    category: str
    title: str
    summary: str = ""
    source_file: str = ""
    sort_order: int = 0
    questions: list[StrategyQuestionOut] = Field(default_factory=list)


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
    wrong_count: int = 0
    attempt_count: int = 0
    last_wrong_at: str | None = None


class WrongItemPatch(BaseModel):
    active: bool | None = None
    learned: bool | None = None
    source: str = "manual"


class WrongCountPatch(BaseModel):
    wrong_count: int = Field(ge=0)


class AttemptCountPatch(BaseModel):
    attempt_count: int = Field(ge=0)


class PracticeRecordCreate(BaseModel):
    session_key: str = Field(min_length=1)
    mode_type: str = Field(min_length=1)
    exam_code: str = ""
    label: str = Field(min_length=1)
    question_ids: list[int] = Field(default_factory=list)
    current_index: int = Field(default=0, ge=0)
    results: dict[str, Any] = Field(default_factory=dict)


class PracticeRecordPatch(BaseModel):
    current_index: int | None = Field(default=None, ge=0)
    results: dict[str, Any] | None = None


class PracticeRecordSummary(BaseModel):
    id: int
    session_key: str
    mode_type: str
    exam_code: str = ""
    label: str
    current_index: int
    total_questions: int
    answered_count: int
    created_at: str
    updated_at: str


class PracticeRecordOut(PracticeRecordSummary):
    question_ids: list[int]
    results: dict[str, Any] = Field(default_factory=dict)
    questions: list[QuestionOut] = Field(default_factory=list)


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
