from __future__ import annotations

import unittest

from app.utils import normalize_explanation_text


class ExplanationNormalizationTest(unittest.TestCase):
    def test_removes_only_unwanted_newline_characters(self):
        value = (
            "达成一致\n"
            "意见，A 最好。"
            "C 的意思是鼓励双方一起承担、完成该任务，\n"
            "并不必然"
        )

        self.assertEqual(
            normalize_explanation_text(value),
            "达成一致意见，A 最好。C 的意思是鼓励双方一起承担、完成该任务，并不必然",
        )

    def test_keeps_structural_newlines_unchanged(self):
        value = "一句完整。\n这是自然分段\n标题：\n内容\n\n1. 保留列表\n下一句也保留\nA. 选项行\n继续保留"

        self.assertEqual(normalize_explanation_text(value), value)

    def test_keeps_surrounding_text_spaces_and_punctuation(self):
        value = "前半句 ， \n  后半句"

        self.assertEqual(normalize_explanation_text(value), "前半句 ，   后半句")


if __name__ == "__main__":
    unittest.main()
