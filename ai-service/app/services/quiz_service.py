import random
import re
from pydantic import ValidationError

from app.core.config import settings
from app.core.exceptions import AIResponseError
from app.prompts.quiz_v1 import build_quiz_prompt, PROMPT_VERSION
from app.schemas.quiz import (
    QuizRequest,
    QuizResponse
)
from app.services.ai_client import AIClient


def shuffle_and_balance_question(q_dict: dict) -> dict:
    """
    Shuffles options for a question while maintaining 100% correct answer synchronization.
    This guarantees unbiased option distribution across A, B, C, D while keeping the
    correct option strictly mapped to the updated letter.
    """
    options = q_dict.get("options", [])
    raw_answer = q_dict.get("correctAnswer", "A")

    if not options or len(options) != 4:
        return q_dict

    # 1. Determine index of correct option
    correct_idx = 0
    if isinstance(raw_answer, int) and 0 <= raw_answer < len(options):
        correct_idx = raw_answer
    elif isinstance(raw_answer, str):
        clean_raw = raw_answer.strip().upper()
        if clean_raw.startswith(("A", "B", "C", "D")):
            letter = clean_raw[0]
            correct_idx = ord(letter) - ord("A")
        else:
            # Fallback to string matching against options
            for idx, opt in enumerate(options):
                clean_opt = re.sub(r"^[A-Da-d][\s.):\-\]]+\s*", "", str(opt)).strip().lower()
                clean_target = re.sub(r"^[A-Da-d][\s.):\-\]]+\s*", "", str(raw_answer)).strip().lower()
                if clean_opt == clean_target or str(opt).strip().lower() == str(raw_answer).strip().lower():
                    correct_idx = idx
                    break

    # 2. Extract clean text without old prefixes and tag the correct one
    items = []
    for idx, opt in enumerate(options):
        clean_text = re.sub(r"^[A-Da-d][\s.):\-\]]+\s*", "", str(opt)).strip()
        items.append((clean_text, idx == correct_idx))

    # 3. Shuffle options randomly
    random.shuffle(items)

    # 4. Re-assign letters A, B, C, D and synchronize correctAnswer
    new_options = []
    new_correct_letter = "A"
    letters = ["A", "B", "C", "D"]

    for i, (text, is_corr) in enumerate(items):
        new_options.append(f"{letters[i]}) {text}")
        if is_corr:
            new_correct_letter = letters[i]

    q_dict["options"] = new_options
    q_dict["correctAnswer"] = new_correct_letter
    return q_dict


class QuizService:

    def __init__(self):
        self.ai_client = AIClient()

    def generate(
        self,
        request: QuizRequest
    ) -> QuizResponse:

        prompt = build_quiz_prompt(request)

        ai_response = self.ai_client.generate(
            prompt=prompt,
            model=settings.AI_QUIZ_MODEL
        )

        # Shuffle options to enforce answer position diversity (approx 25% A, B, C, D)
        if "questions" in ai_response and isinstance(ai_response["questions"], list):
            ai_response["questions"] = [
                shuffle_and_balance_question(q) for q in ai_response["questions"]
            ]

        # Inject model and prompt version metadata
        ai_response["model"] = settings.AI_QUIZ_MODEL
        ai_response["promptVersion"] = PROMPT_VERSION

        try:
            return QuizResponse(
                **ai_response
            )

        except ValidationError as error:
            raise AIResponseError(
                "AI returned invalid quiz structure"
            ) from error