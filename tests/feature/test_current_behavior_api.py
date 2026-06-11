from __future__ import annotations

import importlib
import os
import unittest
import uuid
from urllib.parse import parse_qsl, urlencode, urlsplit, urlunsplit

try:
    import psycopg
    from fastapi.testclient import TestClient
    from psycopg.rows import dict_row
except Exception as exc:  # pragma: no cover - exercised only in under-provisioned envs
    psycopg = None
    TestClient = None
    dict_row = None
    IMPORT_ERROR = exc
else:
    IMPORT_ERROR = None


TEST_DB_ENV = "PMP_TEST_DATABASE_URL"
ENV_KEYS = (
    "DATABASE_URL",
    "SESSION_SECRET",
    "COOKIE_SECURE",
    "FIRST_ADMIN_USERNAME",
    "FIRST_ADMIN_PASSWORD",
    "FIRST_ADMIN_DISPLAY_NAME",
)


def database_url_for_schema(url: str, schema: str) -> str:
    parts = urlsplit(url)
    query = dict(parse_qsl(parts.query, keep_blank_values=True))
    query["options"] = f"-csearch_path={schema},public"
    return urlunsplit((parts.scheme, parts.netloc, parts.path, urlencode(query), parts.fragment))


class CurrentBehaviorApiFeatureTest(unittest.TestCase):
    maxDiff = None

    def setUp(self) -> None:
        if IMPORT_ERROR is not None:
            raise unittest.SkipTest(f"Missing runtime dependency for feature tests: {IMPORT_ERROR}")
        self.admin_db_url = os.environ.get(TEST_DB_ENV)
        if not self.admin_db_url:
            raise unittest.SkipTest(
                f"Set {TEST_DB_ENV} to a disposable PostgreSQL database URL. "
                "Tests create and drop an isolated temporary schema per test."
            )

        self._old_env = {key: os.environ.get(key) for key in ENV_KEYS}
        self.schema = f"pmp_feature_{uuid.uuid4().hex}"
        self.schema_db_url = database_url_for_schema(self.admin_db_url, self.schema)

        with psycopg.connect(self.admin_db_url, autocommit=True) as conn:
            conn.execute(f'CREATE SCHEMA "{self.schema}"')

        os.environ["DATABASE_URL"] = self.schema_db_url
        os.environ["SESSION_SECRET"] = "feature-test-session-secret"
        os.environ["COOKIE_SECURE"] = "0"
        os.environ["FIRST_ADMIN_USERNAME"] = "admin"
        os.environ["FIRST_ADMIN_PASSWORD"] = "admin-password"
        os.environ["FIRST_ADMIN_DISPLAY_NAME"] = "Admin"

        main_module = importlib.import_module("app.main")
        self.auth_module = importlib.import_module("app.auth")
        self.client_context = TestClient(main_module.app)
        self.client = self.client_context.__enter__()

    def tearDown(self) -> None:
        if hasattr(self, "client_context"):
            self.client_context.__exit__(None, None, None)
        if getattr(self, "admin_db_url", None) and getattr(self, "schema", None) and psycopg is not None:
            with psycopg.connect(self.admin_db_url, autocommit=True) as conn:
                conn.execute(f'DROP SCHEMA IF EXISTS "{self.schema}" CASCADE')
        if hasattr(self, "_old_env"):
            for key, value in self._old_env.items():
                if value is None:
                    os.environ.pop(key, None)
                else:
                    os.environ[key] = value

    def db(self):
        return psycopg.connect(self.schema_db_url, row_factory=dict_row)

    def login(self, username: str = "admin", password: str = "admin-password"):
        response = self.client.post("/api/auth/login", json={"username": username, "password": password})
        self.assertEqual(response.status_code, 200, response.text)
        return response

    def seed_user(self, username: str = "learner", password: str = "learner-password", role: str = "user", active: bool = True) -> int:
        password_hash = self.auth_module.hash_password(password)
        with self.db() as conn:
            row = conn.execute(
                """
                INSERT INTO users (username, display_name, password_hash, role, is_active)
                VALUES (%s, %s, %s, %s, %s)
                RETURNING id
                """,
                (username, username.title(), password_hash, role, int(active)),
            ).fetchone()
            conn.commit()
            return int(row["id"])

    def seed_exam(self, code: str = "sim7", title: str | None = None) -> int:
        with self.db() as conn:
            row = conn.execute(
                """
                INSERT INTO exams (code, title, source_markdown, source_excel)
                VALUES (%s, %s, %s, %s)
                RETURNING id
                """,
                (code, title or code.upper(), f"{code}.md", f"{code}.xlsx"),
            ).fetchone()
            conn.commit()
            return int(row["id"])

    def seed_question(
        self,
        exam_id: int,
        number: int,
        correct_answer: str = "A",
        stem: str | None = None,
        explanation: str | None = None,
        is_multi: bool = False,
        options: tuple[tuple[str, str], ...] = (("A", "Alpha"), ("B", "Beta"), ("C", "Gamma")),
    ) -> int:
        with self.db() as conn:
            row = conn.execute(
                """
                INSERT INTO questions (exam_id, number, stem, is_multi, correct_answer, explanation)
                VALUES (%s, %s, %s, %s, %s, %s)
                RETURNING id
                """,
                (
                    exam_id,
                    number,
                    stem or f"Question {number}",
                    int(is_multi),
                    correct_answer,
                    explanation or f"Explanation {number}",
                ),
            ).fetchone()
            question_id = int(row["id"])
            for label, text in options:
                conn.execute(
                    "INSERT INTO options (question_id, label, text) VALUES (%s, %s, %s)",
                    (question_id, label, text),
                )
            conn.commit()
            return question_id

    def seed_strategy(self, exam_code: str, question_id: int, category: str = "通用思路", title: str = "先识别题型") -> int:
        with self.db() as conn:
            row = conn.execute(
                """
                INSERT INTO strategies (exam_code, category, title, summary, source_file, sort_order)
                VALUES (%s, %s, %s, %s, %s, %s)
                RETURNING id
                """,
                (exam_code, category, title, title, "source.pdf", 1),
            ).fetchone()
            strategy_id = int(row["id"])
            conn.execute(
                "INSERT INTO strategy_question_links (strategy_id, question_id) VALUES (%s, %s)",
                (strategy_id, question_id),
            )
            conn.commit()
            return strategy_id

    def test_public_static_and_health_entrypoints_current_contract(self):
        health = self.client.get("/api/health")
        self.assertEqual(health.status_code, 200)
        self.assertEqual(health.json(), {"ok": True})

        favicon = self.client.get("/favicon.ico")
        self.assertEqual(favicon.status_code, 204)
        self.assertEqual(favicon.content, b"")

        probe = self.client.get("/.well-known/appspecific/com.chrome.devtools.json")
        self.assertEqual(probe.status_code, 200)
        self.assertEqual(probe.json(), {})

        frontend = self.client.get("/strategies")
        self.assertEqual(frontend.status_code, 200)
        self.assertIn("text/html", frontend.headers["content-type"])

    def test_auth_session_cookie_and_audit_record_lifecycle(self):
        anonymous = self.client.get("/api/exams")
        self.assertEqual(anonymous.status_code, 401)
        self.assertEqual(anonymous.json()["detail"], "请先登录")

        bad_login = self.client.post("/api/auth/login", json={"username": "admin", "password": "wrong"})
        self.assertEqual(bad_login.status_code, 401)
        self.assertEqual(bad_login.json()["detail"], "用户名或密码错误")

        login = self.login()
        self.assertIn("pmp_session", login.cookies)
        self.assertEqual(set(login.json()), {"id", "username", "display_name", "role", "is_active"})

        me = self.client.get("/api/auth/me")
        self.assertEqual(me.status_code, 200)
        self.assertEqual(me.json()["username"], "admin")

        with self.db() as conn:
            sessions_before_logout = conn.execute("SELECT COUNT(*) AS count FROM auth_sessions").fetchone()["count"]
        self.assertEqual(sessions_before_logout, 1)

        logout = self.client.post("/api/auth/logout")
        self.assertEqual(logout.status_code, 200)
        self.assertEqual(logout.json(), {"ok": True})

        with self.db() as conn:
            sessions_after_logout = conn.execute("SELECT COUNT(*) AS count FROM auth_sessions").fetchone()["count"]
        self.assertEqual(sessions_after_logout, 0)
        self.assertEqual(self.client.get("/api/auth/me").status_code, 401)

    def test_users_api_admin_contract_and_rejection_paths_current_role_coercion(self):
        self.seed_user("learner")
        self.login("learner", "learner-password")
        denied = self.client.get("/api/users")
        self.assertEqual(denied.status_code, 403)
        self.assertEqual(denied.json()["detail"], "需要管理员权限")

        self.client.cookies.clear()
        self.login()
        created = self.client.post(
            "/api/users",
            json={"username": "  new_user  ", "display_name": " New User ", "password": "new-password", "role": "owner"},
        )
        self.assertEqual(created.status_code, 200, created.text)
        # 现状：create_user 对非法 role 不报错，而是保存为普通 user。
        self.assertEqual(created.json()["username"], "new_user")
        self.assertEqual(created.json()["display_name"], "New User")
        self.assertEqual(created.json()["role"], "user")

        invalid_role = self.client.patch(f"/api/users/{created.json()['id']}", json={"role": "owner"})
        self.assertEqual(invalid_role.status_code, 400)
        self.assertEqual(invalid_role.json()["detail"], "角色无效")

        missing = self.client.patch("/api/users/999999", json={"display_name": "Nobody"})
        self.assertEqual(missing.status_code, 404)
        self.assertEqual(missing.json()["detail"], "用户不存在")

        listed = self.client.get("/api/users")
        self.assertEqual(listed.status_code, 200)
        self.assertTrue(all(set(user) == {"id", "username", "display_name", "role", "is_active"} for user in listed.json()))

    def test_questions_and_exams_current_counts_shapes_filters_and_mixed_exam_ignored(self):
        user_id = self.seed_user("learner")
        sim7 = self.seed_exam("sim7", "模拟七")
        sim8 = self.seed_exam("sim8", "模拟八")
        q1 = self.seed_question(sim7, 1, "A", stem="Alpha stem", explanation="Alpha explanation")
        q2 = self.seed_question(sim7, 2, "B", stem="Beta stem", explanation="Beta explanation")
        q3 = self.seed_question(sim8, 1, "C", stem="Gamma stem", explanation="Gamma explanation")
        with self.db() as conn:
            conn.execute(
                "INSERT INTO attempts (user_id, question_id, mode, selected_answer, is_correct) VALUES (%s, %s, 'seed', 'B', 0)",
                (user_id, q1),
            )
            conn.execute(
                """
                INSERT INTO wrong_items (user_id, question_id, active, source, wrong_count_delta, attempt_count_delta)
                VALUES (%s, %s, 1, 'manual', 2, 3)
                """,
                (user_id, q1),
            )
            conn.commit()

        self.login("learner", "learner-password")
        exams = self.client.get("/api/exams")
        self.assertEqual(exams.status_code, 200)
        by_code = {exam["code"]: exam for exam in exams.json()}
        self.assertEqual(by_code["sim7"]["total_questions"], 2)
        self.assertEqual(by_code["sim7"]["wrong_questions"], 1)
        self.assertEqual(by_code["sim7"]["attempts"], 4)

        missing_exam = self.client.get("/api/questions?mode=exam")
        self.assertEqual(missing_exam.status_code, 400)
        self.assertEqual(missing_exam.json()["detail"], "exam is required for exam mode")

        exam_questions = self.client.get("/api/questions?mode=exam&exam=sim7")
        self.assertEqual(exam_questions.status_code, 200)
        self.assertEqual([question["id"] for question in exam_questions.json()], [q1, q2])
        first = exam_questions.json()[0]
        self.assertEqual(
            set(first),
            {
                "id",
                "exam_code",
                "exam_title",
                "number",
                "stem",
                "is_multi",
                "correct_answer",
                "explanation",
                "imported_user_answer",
                "imported_judgement",
                "imported_note",
                "is_wrong_active",
                "wrong_count",
                "attempt_count",
                "last_wrong_at",
                "strategies",
                "options",
            },
        )
        # 现状：题目列表未提交时也返回答案和解析。
        self.assertEqual(first["correct_answer"], "A")
        self.assertEqual(first["explanation"], "Alpha explanation")
        self.assertEqual(first["wrong_count"], 3)
        self.assertEqual(first["attempt_count"], 4)

        mixed_with_exam = self.client.get("/api/questions?mode=mixed&exam=sim7")
        self.assertEqual(mixed_with_exam.status_code, 200)
        # 现状：mixed 模式忽略 exam 参数，所以 sim8 的题也返回。
        self.assertEqual({question["id"] for question in mixed_with_exam.json()}, {q1, q2, q3})

        self.client.cookies.clear()
        self.login()
        admin_denied_for_learner = self.client.get("/api/questions?mode=admin")
        self.assertEqual(admin_denied_for_learner.status_code, 200)
        self.client.cookies.clear()
        self.login("learner", "learner-password")
        denied = self.client.get("/api/questions?mode=admin")
        self.assertEqual(denied.status_code, 403)

    def test_attempts_current_audit_records_answer_normalization_and_wrong_item_lifecycle(self):
        user_id = self.seed_user("learner")
        exam_id = self.seed_exam("sim7")
        question_id = self.seed_question(exam_id, 1, "A、C/B", is_multi=True)

        self.login("learner", "learner-password")
        wrong = self.client.post(
            "/api/attempts",
            json={"question_id": question_id, "selected_options": ["c", "A", "A"], "mode": "practice", "elapsed_seconds": -5},
        )
        self.assertEqual(wrong.status_code, 200, wrong.text)
        self.assertTrue(wrong.json()["is_correct"])
        self.assertEqual(wrong.json()["selected_answer"], "A、C")
        self.assertEqual(wrong.json()["elapsed_seconds"], 0)

        incorrect = self.client.post(
            "/api/attempts",
            json={"question_id": question_id, "selected_options": ["D"], "mode": "practice"},
        )
        self.assertEqual(incorrect.status_code, 200, incorrect.text)
        self.assertFalse(incorrect.json()["is_correct"])
        self.assertTrue(incorrect.json()["is_wrong_active"])
        self.assertIsNone(incorrect.json()["elapsed_seconds"])

        correct_again = self.client.post(
            "/api/attempts",
            json={"question_id": question_id, "selected_options": ["B"], "mode": "practice"},
        )
        self.assertEqual(correct_again.status_code, 200, correct_again.text)
        self.assertTrue(correct_again.json()["is_correct"])
        # 现状：答对不会自动移出错题集。
        self.assertTrue(correct_again.json()["is_wrong_active"])

        with self.db() as conn:
            audit = conn.execute(
                """
                SELECT
                    (SELECT COUNT(*) FROM attempts WHERE user_id = %s AND question_id = %s) AS attempts,
                    (SELECT active FROM wrong_items WHERE user_id = %s AND question_id = %s) AS active
                """,
                (user_id, question_id, user_id, question_id),
            ).fetchone()
        self.assertEqual(audit["attempts"], 3)
        self.assertEqual(audit["active"], 1)

    def test_practice_records_user_scoped_multiple_records_and_patch_lifecycle(self):
        learner_id = self.seed_user("learner")
        other_id = self.seed_user("other")
        exam_id = self.seed_exam("sim7", "模拟七")
        q1 = self.seed_question(exam_id, 1, "A", stem="Question 1")
        q2 = self.seed_question(exam_id, 2, "B", stem="Question 2")

        anonymous = self.client.get("/api/practice-records")
        self.assertEqual(anonymous.status_code, 401)

        self.login("learner", "learner-password")
        first = self.client.post(
            "/api/practice-records",
            json={
                "session_key": "exam:sim7",
                "mode_type": "exam",
                "exam_code": "sim7",
                "label": "模拟七",
                "question_ids": [q1, q2],
            },
        )
        self.assertEqual(first.status_code, 200, first.text)
        second = self.client.post(
            "/api/practice-records",
            json={
                "session_key": "exam:sim7",
                "mode_type": "exam",
                "exam_code": "sim7",
                "label": "模拟七重新开始",
                "question_ids": [q2, q1],
            },
        )
        self.assertEqual(second.status_code, 200, second.text)
        self.assertNotEqual(first.json()["id"], second.json()["id"])

        records = self.client.get("/api/practice-records")
        self.assertEqual(records.status_code, 200)
        self.assertEqual(len(records.json()), 2)
        self.assertEqual({record["session_key"] for record in records.json()}, {"exam:sim7"})
        self.assertTrue(all(record["total_questions"] == 2 for record in records.json()))
        self.assertTrue(all(record["answered_count"] == 0 for record in records.json()))
        self.assertTrue(all(record["updated_at"] for record in records.json()))

        result = {
            str(q1): {
                "question_id": q1,
                "selected_answer": "A",
                "correct_answer": "A",
                "is_correct": True,
                "explanation": "Explanation 1",
                "elapsed_seconds": 12,
            }
        }
        patched = self.client.patch(
            f"/api/practice-records/{first.json()['id']}",
            json={"current_index": 1, "results": result},
        )
        self.assertEqual(patched.status_code, 200, patched.text)
        self.assertEqual(patched.json()["current_index"], 1)
        self.assertEqual(patched.json()["answered_count"], 1)
        self.assertEqual(patched.json()["results"], result)
        self.assertEqual([question["id"] for question in patched.json()["questions"]], [q1, q2])

        fetched = self.client.get(f"/api/practice-records/{first.json()['id']}")
        self.assertEqual(fetched.status_code, 200)
        self.assertEqual(fetched.json()["results"], result)

        self.client.cookies.clear()
        self.login("other", "learner-password")
        hidden = self.client.get(f"/api/practice-records/{first.json()['id']}")
        self.assertEqual(hidden.status_code, 404)
        self.assertEqual(hidden.json()["detail"], "练习记录不存在")

        with self.db() as conn:
            row = conn.execute(
                """
                INSERT INTO practice_records (
                    user_id, session_key, mode_type, exam_code, label,
                    question_ids, current_index, results
                )
                VALUES (%s, 'mixed', 'mixed', '', 'Other mixed', '[%s]'::jsonb, 0, '{}'::jsonb)
                RETURNING id
                """ % ("%s", q1),
                (other_id,),
            ).fetchone()
            conn.commit()
            other_record_id = int(row["id"])

        self.assertEqual(self.client.get(f"/api/practice-records/{other_record_id}").status_code, 200)
        denied_delete = self.client.delete(f"/api/practice-records/{first.json()['id']}")
        self.assertEqual(denied_delete.status_code, 404)

        self.client.cookies.clear()
        self.login("learner", "learner-password")
        deleted = self.client.delete(f"/api/practice-records/{first.json()['id']}")
        self.assertEqual(deleted.status_code, 200)
        self.assertEqual(deleted.json(), {"id": first.json()["id"], "deleted": True})
        remaining = self.client.get("/api/practice-records")
        self.assertEqual([record["id"] for record in remaining.json()], [second.json()["id"]])

    def test_wrong_item_patch_and_manual_count_adjustments_current_side_effects(self):
        user_id = self.seed_user("learner")
        exam_id = self.seed_exam("sim7")
        question_id = self.seed_question(exam_id, 1, "A")
        with self.db() as conn:
            conn.execute(
                "INSERT INTO attempts (user_id, question_id, mode, selected_answer, is_correct) VALUES (%s, %s, 'seed', 'B', 0)",
                (user_id, question_id),
            )
            conn.commit()

        self.login("learner", "learner-password")
        activated = self.client.patch(f"/api/wrong-items/{question_id}", json={})
        self.assertEqual(activated.status_code, 200, activated.text)
        # 现状：空 payload 会激活错题，而不是 no-op。
        self.assertTrue(activated.json()["active"])

        learned = self.client.patch(f"/api/wrong-items/{question_id}", json={"learned": True})
        self.assertEqual(learned.status_code, 200)
        self.assertFalse(learned.json()["active"])
        self.assertIsNotNone(learned.json()["learned_at"])

        zero_wrong = self.client.patch(f"/api/questions/{question_id}/wrong-count", json={"wrong_count": 0})
        self.assertEqual(zero_wrong.status_code, 200, zero_wrong.text)
        self.assertFalse(zero_wrong.json()["is_wrong_active"])
        self.assertEqual(zero_wrong.json()["wrong_count"], 0)

        target_attempts = self.client.patch(f"/api/questions/{question_id}/attempt-count", json={"attempt_count": 5})
        self.assertEqual(target_attempts.status_code, 200, target_attempts.text)
        self.assertEqual(target_attempts.json()["attempt_count"], 5)

        with self.db() as conn:
            row = conn.execute(
                """
                SELECT active, source, wrong_count_delta, attempt_count_delta
                FROM wrong_items
                WHERE user_id = %s AND question_id = %s
                """,
                (user_id, question_id),
            ).fetchone()
        # 现状：手动调整作答次数复用 wrong_items 记录，并把 source 改成 manual_adjustment。
        self.assertEqual(row["active"], 0)
        self.assertEqual(row["source"], "manual_adjustment")
        self.assertEqual(row["wrong_count_delta"], -1)
        self.assertEqual(row["attempt_count_delta"], 4)

    def test_question_crud_current_normalization_replacement_soft_delete_and_errors(self):
        exam_id = self.seed_exam("sim7")
        self.login()

        created = self.client.post(
            "/api/questions",
            json={
                "exam_code": "sim7",
                "number": 1,
                "stem": "Created stem",
                "is_multi": True,
                "correct_answer": "c,a",
                "explanation": (
                    "达成一致\n"
                    "意见，A 最好。C 的意思是鼓励双方一起承担、完成该任务，\n"
                    "并不必然\n"
                    "\n"
                    "1. 保留列表\n"
                    "下一句也保留"
                ),
                "options": [{"label": "a", "text": "Alpha"}, {"label": "c", "text": "Gamma"}],
            },
        )
        self.assertEqual(created.status_code, 200, created.text)
        self.assertEqual(created.json()["correct_answer"], "A、C")
        self.assertEqual(
            created.json()["explanation"],
            (
                "达成一致意见，A 最好。"
                "C 的意思是鼓励双方一起承担、完成该任务，并不必然\n"
                "\n"
                "1. 保留列表\n"
                "下一句也保留"
            ),
        )
        self.assertEqual([option["label"] for option in created.json()["options"]], ["A", "C"])

        duplicate = self.client.post(
            "/api/questions",
            json={
                "exam_code": "sim7",
                "number": 1,
                "stem": "Duplicate",
                "correct_answer": "A",
                "explanation": "",
                "options": [{"label": "A", "text": "A"}, {"label": "B", "text": "B"}],
            },
        )
        self.assertEqual(duplicate.status_code, 400)

        unknown_exam = self.client.post(
            "/api/questions",
            json={
                "exam_code": "missing",
                "number": 2,
                "stem": "Missing exam",
                "correct_answer": "A",
                "explanation": "",
                "options": [{"label": "A", "text": "A"}, {"label": "B", "text": "B"}],
            },
        )
        self.assertEqual(unknown_exam.status_code, 400)
        self.assertEqual(unknown_exam.json()["detail"], "Unknown exam_code")

        updated = self.client.patch(
            f"/api/questions/{created.json()['id']}",
            json={
                "correct_answer": "B",
                "explanation": "一句完整。\n这是自然分段\nA. 选项行\n继续保留",
                "options": [{"label": "B", "text": "Replacement"}],
                "imported_note": "kept note",
            },
        )
        self.assertEqual(updated.status_code, 200, updated.text)
        # 现状：传 options 时先删光旧选项，再按 payload 重建。
        self.assertEqual(updated.json()["correct_answer"], "B")
        self.assertEqual(updated.json()["explanation"], "一句完整。\n这是自然分段\nA. 选项行\n继续保留")
        self.assertEqual([(option["label"], option["text"]) for option in updated.json()["options"]], [("B", "Replacement")])
        self.assertEqual(updated.json()["imported_note"], "kept note")

        deleted = self.client.delete(f"/api/questions/{created.json()['id']}")
        self.assertEqual(deleted.status_code, 200)
        self.assertEqual(deleted.json(), {"question_id": created.json()["id"], "deleted": True})

        missing_after_delete = self.client.get(f"/api/questions/{created.json()['id']}")
        self.assertEqual(missing_after_delete.status_code, 404)
        self.assertEqual(missing_after_delete.json()["detail"], "Question not found")

        with self.db() as conn:
            soft_deleted = conn.execute("SELECT deleted_at FROM questions WHERE id = %s", (created.json()["id"],)).fetchone()
            option_count = conn.execute("SELECT COUNT(*) AS count FROM options WHERE question_id = %s", (created.json()["id"],)).fetchone()
        self.assertIsNotNone(soft_deleted["deleted_at"])
        self.assertEqual(option_count["count"], 1)

    def test_strategies_current_order_nested_questions_and_user_wrong_state(self):
        user_id = self.seed_user("learner")
        sim8 = self.seed_exam("sim8")
        sim7 = self.seed_exam("sim7")
        q8 = self.seed_question(sim8, 1, "A", stem="Sim8 question")
        q7 = self.seed_question(sim7, 2, "B", stem="Sim7 question")
        self.seed_strategy("sim8", q8, title="sim8 strategy")
        self.seed_strategy("sim7", q7, title="sim7 strategy")
        with self.db() as conn:
            conn.execute(
                "INSERT INTO wrong_items (user_id, question_id, active, source) VALUES (%s, %s, 1, 'seed')",
                (user_id, q7),
            )
            conn.commit()

        self.login("learner", "learner-password")
        response = self.client.get("/api/strategies")
        self.assertEqual(response.status_code, 200)
        strategies = response.json()
        # 现状：策略排序硬编码 sim7 在 sim8 前。
        self.assertEqual([strategy["exam_code"] for strategy in strategies], ["sim7", "sim8"])
        self.assertEqual(strategies[0]["questions"][0]["id"], q7)
        self.assertTrue(strategies[0]["questions"][0]["is_wrong_active"])
        self.assertFalse(strategies[1]["questions"][0]["is_wrong_active"])

        question = self.client.get(f"/api/questions/{q7}")
        self.assertEqual(question.status_code, 200)
        self.assertEqual(question.json()["strategies"][0]["title"], "sim7 strategy")


if __name__ == "__main__":
    unittest.main()
