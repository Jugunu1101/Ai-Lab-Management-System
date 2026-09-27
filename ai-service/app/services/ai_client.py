import json
import time

import httpx
from google import genai
from google.genai import errors

from app.core.config import settings
from app.core.exceptions import AIServiceError
from app.core.logging import logger, request_id_context


class AIClient:
    """Small, synchronous wrapper around the Google AI Studio Gemini API."""

    _RETRYABLE_STATUS_CODES = frozenset({408, 429, 500, 502, 503, 504})
    _JSON_RESPONSE_FORMAT = {
        "type": "text",
        "mime_type": "application/json",
        # Endpoint-specific Pydantic validation remains the source of truth for
        # the response shape. This schema asks Gemini to return a JSON object.
        "schema": {"type": "object"},
    }

    @property
    def mock_mode(self):
        return settings.AI_MOCK_MODE

    @mock_mode.setter
    def mock_mode(self, value):
        pass

    def __init__(self):
        # Google documents GOOGLE_API_KEY as taking precedence when both are
        # present, so mirror the native SDK's environment-variable behavior.
        api_key = settings.GOOGLE_API_KEY or settings.GEMINI_API_KEY
        if not settings.AI_MOCK_MODE and not api_key:
            raise AIServiceError(
                "Gemini API key is missing. Set GEMINI_API_KEY (or GOOGLE_API_KEY), "
                "or enable AI_MOCK_MODE."
            )

        self.provider = "gemini"
        self.client = None
        if not settings.AI_MOCK_MODE:
            self.client = genai.Client(api_key=api_key)

    def generate(
        self,
        prompt: str,
        model: str,
    ) -> dict:
        if settings.AI_MOCK_MODE:
            return self._generate_mock_response(prompt)

        if self.client is None:
            raise AIServiceError("Gemini client is not initialized")

        attempts = 0
        max_attempts = max(1, settings.AI_MAX_RETRIES)
        req_id = request_id_context.get()

        while attempts < max_attempts:
            attempts += 1
            try:
                response = self.client.interactions.create(
                    model=model,
                    input=(
                        "You are a programming education AI. Always return a single "
                        "valid JSON object with no Markdown or extra prose.\n\n"
                        f"{prompt}"
                    ),
                    response_format=self._JSON_RESPONSE_FORMAT,
                    timeout=settings.AI_REQUEST_TIMEOUT,
                )
                content = self._clean_json_content(response.output_text)

                if attempts > 1:
                    logger.info(
                        "gemini_request_retry_success",
                        extra={
                            "model": model,
                            "attempt": attempts,
                            "request_id": req_id,
                        },
                    )

                return json.loads(content)

            except json.JSONDecodeError as error:
                raise AIServiceError("AI returned invalid JSON") from error

            except (errors.APIError, httpx.TimeoutException, httpx.NetworkError) as error:
                if not self._is_retryable_error(error):
                    logger.error(
                        "gemini_request_fatal_error",
                        extra={
                            "model": model,
                            "error_type": type(error).__name__,
                            "request_id": req_id,
                        },
                    )
                    raise AIServiceError("AI generation failed") from error

                logger.warning(
                    "gemini_request_failed",
                    extra={
                        "model": model,
                        "attempt": attempts,
                        "error_type": type(error).__name__,
                        "request_id": req_id,
                    },
                )

                if attempts >= max_attempts:
                    logger.error(
                        "gemini_request_exhausted",
                        extra={
                            "model": model,
                            "max_attempts": max_attempts,
                            "request_id": req_id,
                        },
                    )
                    raise AIServiceError("AI generation failed after retries") from error

                time.sleep(2**attempts)

        raise AIServiceError("AI generation failed after retries")

    @classmethod
    def _is_retryable_error(cls, error: Exception) -> bool:
        if isinstance(error, errors.APIError):
            return getattr(error, "code", None) in cls._RETRYABLE_STATUS_CODES

        return isinstance(error, (httpx.TimeoutException, httpx.NetworkError))

    @staticmethod
    def _clean_json_content(content: str | None) -> str:
        content = (content or "").strip()
        if content.startswith("```json"):
            content = content[7:]
        elif content.startswith("```"):
            content = content[3:]
        if content.endswith("```"):
            content = content[:-3]
        return content.strip()

    def _generate_mock_response(
        self,
        prompt: str,
    ) -> dict:
        if "multiple-choice quiz" in prompt:
            import re
            import json
            import random

            match = re.search(r"Generate exactly (\d+)", prompt)
            count = int(match.group(1)) if match else 10

            # Helper to shuffle question options and update correctAnswer letter
            def _shuffle_question(q_dict: dict) -> dict:
                options = q_dict.get("options", [])
                raw_ans = q_dict.get("correctAnswer", "A")
                if not options or len(options) != 4:
                    return q_dict

                correct_idx = 0
                if isinstance(raw_ans, int) and 0 <= raw_ans < len(options):
                    correct_idx = raw_ans
                elif isinstance(raw_ans, str):
                    clean_raw = raw_ans.strip().upper()
                    if clean_raw.startswith(("A", "B", "C", "D")):
                        correct_idx = ord(clean_raw[0]) - ord("A")
                    else:
                        for idx, opt in enumerate(options):
                            clean_opt = re.sub(r"^[A-Da-d][\s.):\-\]]+\s*", "", str(opt)).strip().lower()
                            clean_target = re.sub(r"^[A-Da-d][\s.):\-\]]+\s*", "", str(raw_ans)).strip().lower()
                            if clean_opt == clean_target or str(opt).strip().lower() == str(raw_ans).strip().lower():
                                correct_idx = idx
                                break

                items = []
                for idx, opt in enumerate(options):
                    clean_text = re.sub(r"^[A-Da-d][\s.):\-\]]+\s*", "", str(opt)).strip()
                    items.append((clean_text, idx == correct_idx))

                random.shuffle(items)

                letters = ["A", "B", "C", "D"]
                new_options = []
                new_correct_letter = "A"
                for i, (text, is_corr) in enumerate(items):
                    new_options.append(f"{letters[i]}) {text}")
                    if is_corr:
                        new_correct_letter = letters[i]

                q_dict["options"] = new_options
                q_dict["correctAnswer"] = new_correct_letter
                return q_dict

            # Extract target topics
            target_topics = ["loops", "arrays", "basics"]
            if "Use only these topics:" in prompt:
                try:
                    start_idx = prompt.index("Use only these topics:")
                    json_start = prompt.index("[", start_idx)
                    json_end = prompt.index("]", json_start) + 1
                    target_topics = json.loads(prompt[json_start:json_end])
                except Exception:
                    pass

            def map_topic_alias(t: str) -> str:
                norm = t.lower().strip()
                if norm in ("variables", "data-types", "operators", "basics"):
                    return "basics"
                if norm in ("conditionals", "logic", "boolean"):
                    return "logic"
                if norm in ("syntax", "functions"):
                    return "syntax"
                if norm in ("loops", "iteration"):
                    return "loops"
                if norm in ("arrays", "stl-vectors", "lists"):
                    return "arrays"
                if norm in ("recursion",):
                    return "recursion"
                if norm in ("searching", "binary-search"):
                    return "searching"
                return norm

            # Extract previously asked questions for exclusion
            excluded_questions = []
            if "PREVIOUSLY ASKED QUESTIONS" in prompt:
                try:
                    start_idx = prompt.index("PREVIOUSLY ASKED QUESTIONS")
                    json_start = prompt.index("[", start_idx)
                    depth = 0
                    json_end = json_start
                    in_quote = False
                    escape = False
                    for i in range(json_start, len(prompt)):
                        char = prompt[i]
                        if escape:
                            escape = False
                            continue
                        if char == "\\":
                            escape = True
                            continue
                        if char == '"':
                            in_quote = not in_quote
                            continue
                        if not in_quote:
                            if char == "[":
                                depth += 1
                            elif char == "]":
                                depth -= 1
                                if depth == 0:
                                    json_end = i + 1
                                    break
                    excluded_questions = json.loads(prompt[json_start:json_end])
                except Exception:
                    pass

            def normalize_text(text: str) -> str:
                return re.sub(r"[^a-zA-Z0-9]", "", text.lower())

            excluded_set = {normalize_text(q) for q in excluded_questions if isinstance(q, str)}

            # Extract target language
            lang_match = re.search(r"Programming language:\s*([a-zA-Z0-9_\+#]+)", prompt, re.IGNORECASE)
            raw_lang = lang_match.group(1).lower().strip() if lang_match else "cpp"
            if raw_lang in ("c++", "cpp"):
                target_lang = "cpp"
            elif raw_lang in ("c",):
                target_lang = "c"
            elif raw_lang in ("java",):
                target_lang = "java"
            elif raw_lang in ("python", "py"):
                target_lang = "python"
            else:
                target_lang = "cpp"

            # Comprehensive, Real Programming Assessment Question Pool
            topic_pools = {
                ("basics", "cpp"): [
                    {
                        "question": "What is the output of the following C++ code snippet?\nint a = 5;\nint b = a++;\nint c = ++a;\nstd::cout << a << \" \" << b << \" \" << c;",
                        "options": ["A) 7 5 7", "B) 6 5 7", "C) 7 6 7", "D) 6 6 6"],
                        "correctAnswer": "A",
                        "explanation": "b receives 5 (postfix increment, a becomes 6). Then ++a increments a to 7 and assigns 7 to c. Final values: a=7, b=5, c=7.",
                        "topic": "basics",
                        "difficulty": "medium",
                    },
                    {
                        "question": "In C++, what is the value of `result` after executing:\nint x = 10, y = 20;\nint result = (x > y) ? (x - y) : (y - x);\nstd::cout << result;",
                        "options": ["A) 10", "B) -10", "C) 20", "D) 0"],
                        "correctAnswer": "A",
                        "explanation": "Since 10 > 20 is false, the ternary operator evaluates the false branch: 20 - 10 = 10.",
                        "topic": "basics",
                        "difficulty": "easy",
                    },
                    {
                        "question": "What does the `const` qualifier indicate when applied to a variable in C++?\nconst int MAX_USERS = 100;",
                        "options": [
                            "A) The variable is read-only and its value cannot be modified after initialization",
                            "B) The variable is stored in dynamic heap memory",
                            "C) The variable has local scope only inside main()",
                            "D) The variable is automatically converted to a double",
                        ],
                        "correctAnswer": "A",
                        "explanation": "In C++, const enforces immutability at compile time; any reassignment triggers a compiler error.",
                        "topic": "basics",
                        "difficulty": "easy",
                    },
                    {
                        "question": "What is the output of this C++ code involving integer overflow awareness?\nint a = 10, b = 4;\ndouble c = static_cast<double>(a) / b;\nstd::cout << c;",
                        "options": ["A) 2.5", "B) 2", "C) 2.0", "D) 0.4"],
                        "correctAnswer": "A",
                        "explanation": "static_cast<double>(a) converts 10 to 10.0, promoting floating-point division 10.0 / 4 = 2.5.",
                        "topic": "basics",
                        "difficulty": "medium",
                    },
                ],
                ("logic", "cpp"): [
                    {
                        "question": "What is the output of the following C++ conditional code:\nint score = 75;\nbool passed = (score >= 50) && (score < 80);\nbool honors = (score >= 80) || (score == 100);\nstd::cout << (passed ? \"PASS\" : \"FAIL\") << \" \" << (honors ? \"YES\" : \"NO\");",
                        "options": ["A) PASS NO", "B) PASS YES", "C) FAIL NO", "D) FAIL YES"],
                        "correctAnswer": "A",
                        "explanation": "passed is true (75 in [50, 80)). honors is false (75 < 80 and 75 != 100). Output is 'PASS NO'.",
                        "topic": "logic",
                        "difficulty": "medium",
                    },
                    {
                        "question": "What is the output of short-circuit evaluation in C++:\nint count = 0;\nif (false && (++count > 0)) {}\nstd::cout << count;",
                        "options": ["A) 0", "B) 1", "C) Compiler error", "D) Undefined behavior"],
                        "correctAnswer": "A",
                        "explanation": "In C++, the logical AND operator (&&) short-circuits: since the left operand is false, the right operand (++count > 0) is never evaluated.",
                        "topic": "logic",
                        "difficulty": "medium",
                    },
                    {
                        "question": "What is the output of this C++ switch statement:\nint val = 2;\nswitch (val) {\n    case 1: std::cout << \"1\";\n    case 2: std::cout << \"2\";\n    case 3: std::cout << \"3\"; break;\n    default: std::cout << \"D\";\n}",
                        "options": ["A) 23", "B) 2", "C) 123", "D) 23D"],
                        "correctAnswer": "A",
                        "explanation": "Since case 2 lacks a break statement, execution falls through to case 3, outputting '23' before breaking.",
                        "topic": "logic",
                        "difficulty": "medium",
                    },
                ],
                ("syntax", "cpp"): [
                    {
                        "question": "In C++, what does pass-by-reference (`void update(int &x)`) achieve compared to pass-by-value (`void update(int x)`)?",
                        "options": [
                            "A) It allows the function to directly modify the caller's argument without copying",
                            "B) It allocates memory on the heap using new",
                            "C) It prevents the function from accessing the argument",
                            "D) It ensures the variable cannot be modified",
                        ],
                        "correctAnswer": "A",
                        "explanation": "Reference parameters (&x) bind directly to the caller's variable, enabling in-place mutation without copy overhead.",
                        "topic": "syntax",
                        "difficulty": "easy",
                    },
                    {
                        "question": "What is the output of the following C++ function call:\nvoid swapVals(int &a, int b) {\n    a += 5;\n    b += 10;\n}\n// In main:\nint x = 10, y = 20;\nswapVals(x, y);\nstd::cout << x << \" \" << y;",
                        "options": ["A) 15 20", "B) 15 30", "C) 10 20", "D) 10 30"],
                        "correctAnswer": "A",
                        "explanation": "x is passed by reference and is modified (10 + 5 = 15). y is passed by value, so the caller's y remains 20.",
                        "topic": "syntax",
                        "difficulty": "medium",
                    },
                ],
                ("loops", "cpp"): [
                    {
                        "question": "What is the output of the following C++ code snippet:\nint sum = 0;\nfor (int i = 1; i <= 5; i++) {\n    if (i % 2 == 0) sum += i;\n}\nstd::cout << sum;",
                        "options": ["A) 6", "B) 15", "C) 9", "D) 10"],
                        "correctAnswer": "A",
                        "explanation": "The loop iterates i = 1, 2, 3, 4, 5. Even numbers are 2 and 4. sum = 2 + 4 = 6.",
                        "topic": "loops",
                        "difficulty": "easy",
                    },
                    {
                        "question": "What is the output of this C++ loop with break and continue:\nint total = 0;\nfor (int i = 1; i <= 6; i++) {\n    if (i == 4) break;\n    if (i % 2 != 0) continue;\n    total += i;\n}\nstd::cout << total;",
                        "options": ["A) 2", "B) 6", "C) 12", "D) 0"],
                        "correctAnswer": "A",
                        "explanation": "i=1: continue. i=2: total += 2 (total=2). i=3: continue. i=4: break immediately. Loop ends with total = 2.",
                        "topic": "loops",
                        "difficulty": "medium",
                    },
                    {
                        "question": "What bug is present in the following C++ loop intended to sum numbers 1 to 5:\nint sum = 0, i = 1;\nwhile (i <= 5);\n{\n    sum += i;\n    i++;\n}\nstd::cout << sum;",
                        "options": [
                            "A) The semicolon after while (i <= 5); creates an infinite empty loop",
                            "B) sum must be initialized to 1",
                            "C) i++ should be ++i",
                            "D) The while loop syntax is invalid",
                        ],
                        "correctAnswer": "A",
                        "explanation": "The semicolon right after while (i <= 5); forms an empty loop body where i is never incremented, creating an infinite loop.",
                        "topic": "loops",
                        "difficulty": "medium",
                    },
                    {
                        "question": "What is the output of this nested C++ loop:\nint count = 0;\nfor (int i = 0; i < 3; i++) {\n    for (int j = i; j < 3; j++) {\n        count++;\n    }\n}\nstd::cout << count;",
                        "options": ["A) 6", "B) 9", "C) 5", "D) 3"],
                        "correctAnswer": "A",
                        "explanation": "i=0: j runs 3 times. i=1: j runs 2 times. i=2: j runs 1 time. Total = 3 + 2 + 1 = 6.",
                        "topic": "loops",
                        "difficulty": "medium",
                    },
                ],
                ("arrays", "cpp"): [
                    {
                        "question": "What is the output of the following C++ code:\nstd::vector<int> v = {10, 20, 30};\nv.push_back(40);\nv.pop_back();\nstd::cout << v.size() << \" \" << v.back();",
                        "options": ["A) 3 30", "B) 4 40", "C) 3 40", "D) 2 20"],
                        "correctAnswer": "A",
                        "explanation": "push_back(40) increases size to 4. pop_back() removes 40, restoring size to 3 and making 30 the back element.",
                        "topic": "arrays",
                        "difficulty": "medium",
                    },
                    {
                        "question": "What bug occurs in the following C++ array traversal:\nint arr[4] = {1, 2, 3, 4};\nfor (int i = 0; i <= 4; i++) {\n    std::cout << arr[i] << \" \";\n}",
                        "options": [
                            "A) An off-by-one error causing out-of-bounds access at arr[4]",
                            "B) Array elements must be initialized with new",
                            "C) Arrays cannot be printed inside a for loop",
                            "D) Variable i must be declared unsigned",
                        ],
                        "correctAnswer": "A",
                        "explanation": "Valid indices for a 4-element array are 0 to 3. The condition i <= 4 accesses arr[4], which is undefined memory.",
                        "topic": "arrays",
                        "difficulty": "medium",
                    },
                    {
                        "question": "What is the time complexity of appending an element to a `std::vector` using `push_back` in C++?",
                        "options": [
                            "A) Amortized O(1)",
                            "B) Strict O(N)",
                            "C) O(log N)",
                            "D) O(N^2)",
                        ],
                        "correctAnswer": "A",
                        "explanation": "std::vector doubling capacity reallocation ensures amortized constant time O(1) for push_back.",
                        "topic": "arrays",
                        "difficulty": "medium",
                    },
                ],
                ("recursion", "cpp"): [
                    {
                        "question": "What is the output of the recursive C++ function:\nint f(int n) {\n    if (n <= 1) return 1;\n    return n * f(n - 2);\n}\n// std::cout << f(5);",
                        "options": ["A) 15", "B) 120", "C) 25", "D) 5"],
                        "correctAnswer": "A",
                        "explanation": "f(5) = 5 * f(3) = 5 * (3 * f(1)) = 5 * 3 * 1 = 15.",
                        "topic": "recursion",
                        "difficulty": "medium",
                    },
                    {
                        "question": "What happens if a recursive function in C++ is called without a valid base case?",
                        "options": [
                            "A) The call stack overflows resulting in a runtime crash (Segmentation fault / Stack overflow)",
                            "B) The compiler automatically inserts a base case return 0",
                            "C) The function returns nullptr",
                            "D) The memory is moved to the heap automatically",
                        ],
                        "correctAnswer": "A",
                        "explanation": "Infinite recursion continuously pushes stack frames until stack memory limit is exceeded, terminating the process.",
                        "topic": "recursion",
                        "difficulty": "easy",
                    },
                ],
                ("searching", "cpp"): [
                    {
                        "question": "What is the worst-case number of comparisons in Binary Search over a sorted array of 64 elements?",
                        "options": ["A) 7", "B) 64", "C) 32", "D) 1"],
                        "correctAnswer": "A",
                        "explanation": "Binary search takes at most floor(log2(N)) + 1 comparisons. For 64: log2(64) + 1 = 6 + 1 = 7.",
                        "topic": "searching",
                        "difficulty": "medium",
                    },
                    {
                        "question": "What prerequisite must be met before executing binary search on an array or vector?",
                        "options": [
                            "A) The elements must be sorted in monotonic order",
                            "B) The size must be an exact power of two",
                            "C) All elements must be unique positive integers",
                            "D) The container must be allocated using new",
                        ],
                        "correctAnswer": "A",
                        "explanation": "Binary search relies on sorted ordering to eliminate half of the remaining search space at each comparison step.",
                        "topic": "searching",
                        "difficulty": "easy",
                    },
                ],
                # Python Pools
                ("basics", "python"): [
                    {
                        "question": "What is the output of the following Python code snippet:\na = [1, 2, 3]\nb = a\nb.append(4)\nprint(len(a))",
                        "options": ["A) 4", "B) 3", "C) 1", "D) Error"],
                        "correctAnswer": "A",
                        "explanation": "In Python, b = a binds b to the same list object in memory. Mutating b directly mutates a.",
                        "topic": "basics",
                        "difficulty": "medium",
                    },
                    {
                        "question": "What is the value of `x` after executing:\nx = 10 if 5 > 8 else 20\nprint(x)",
                        "options": ["A) 20", "B) 10", "C) None", "D) False"],
                        "correctAnswer": "A",
                        "explanation": "The ternary expression evaluates to the else branch (20) because 5 > 8 is False.",
                        "topic": "basics",
                        "difficulty": "easy",
                    },
                ],
                ("loops", "python"): [
                    {
                        "question": "What is the output of the following Python loop:\ntotal = 0\nfor i in range(1, 6):\n    if i % 2 == 0:\n        total += i\nprint(total)",
                        "options": ["A) 6", "B) 15", "C) 9", "D) 10"],
                        "correctAnswer": "A",
                        "explanation": "range(1, 6) produces 1, 2, 3, 4, 5. The evens are 2 and 4. 2 + 4 = 6.",
                        "topic": "loops",
                        "difficulty": "easy",
                    },
                    {
                        "question": "What is the output of this Python loop with break:\ns = 0\nfor x in [2, 4, 6, 8]:\n    if x == 6:\n        break\n    s += x\nprint(s)",
                        "options": ["A) 6", "B) 12", "C) 20", "D) 2"],
                        "correctAnswer": "A",
                        "explanation": "x=2: s=2. x=4: s=6. x=6: break terminates the loop. Output is 6.",
                        "topic": "loops",
                        "difficulty": "medium",
                    },
                ],
                ("arrays", "python"): [
                    {
                        "question": "What is the output of list slicing in Python:\nnums = [10, 20, 30, 40, 50]\nprint(nums[1:4])",
                        "options": ["A) [20, 30, 40]", "B) [10, 20, 30]", "C) [20, 30, 40, 50]", "D) [10, 30, 50]"],
                        "correctAnswer": "A",
                        "explanation": "Slice [1:4] takes indices 1, 2, and 3: 20, 30, 40.",
                        "topic": "arrays",
                        "difficulty": "easy",
                    },
                ],
                # C Pools
                ("basics", "c"): [
                    {
                        "question": "What is the output of the following C code snippet:\nint x = 5;\nint y = ++x * 2;\nprintf(\"%d %d\", x, y);",
                        "options": ["A) 6 12", "B) 5 10", "C) 6 10", "D) 5 12"],
                        "correctAnswer": "A",
                        "explanation": "Prefix ++x increments x from 5 to 6 first, then 6 * 2 = 12 is assigned to y.",
                        "topic": "basics",
                        "difficulty": "medium",
                    },
                ],
                ("loops", "c"): [
                    {
                        "question": "What is the output of the C loop snippet:\nint sum = 0;\nfor (int i = 1; i <= 4; i++) {\n    if (i == 3) continue;\n    sum += i;\n}\nprintf(\"%d\", sum);",
                        "options": ["A) 7", "B) 10", "C) 6", "D) 3"],
                        "correctAnswer": "A",
                        "explanation": "continue skips i=3. sum = 1 + 2 + 4 = 7.",
                        "topic": "loops",
                        "difficulty": "medium",
                    },
                ],
                # Java Pools
                ("basics", "java"): [
                    {
                        "question": "What is the output of the following Java snippet:\nint a = 10;\nint b = a > 5 ? a * 2 : a / 2;\nSystem.out.println(b);",
                        "options": ["A) 20", "B) 5", "C) 10", "D) 15"],
                        "correctAnswer": "A",
                        "explanation": "Since 10 > 5 is true, the ternary operator evaluates 10 * 2 = 20.",
                        "topic": "basics",
                        "difficulty": "easy",
                    },
                ],
                ("loops", "java"): [
                    {
                        "question": "What is the output of the Java loop:\nint count = 0;\nfor (int i = 0; i < 4; i++) {\n    if (i % 2 == 0) count += i;\n}\nSystem.out.println(count);",
                        "options": ["A) 2", "B) 6", "C) 4", "D) 0"],
                        "correctAnswer": "A",
                        "explanation": "i=0: count += 0. i=1: skipped. i=2: count += 2. i=3: skipped. Total is 2.",
                        "topic": "loops",
                        "difficulty": "easy",
                    },
                ],
            }

            def generate_topic_dynamic_question(topic_name: str, lang: str, index: int) -> dict:
                norm_topic = map_topic_alias(topic_name)
                norm_lang = lang.lower().strip()
                q_type = index % 5

                # 1. Code Tracing (Loops & Conditionals)
                if q_type == 0:
                    k = (index % 3) + 2
                    lim = (index % 4) + 4
                    expected_sum = sum(i * k for i in range(1, lim + 1) if i % 2 == 0)
                    distractor1 = sum(i * k for i in range(1, lim + 1))
                    distractor2 = sum(i for i in range(1, lim + 1) if i % 2 == 0)
                    distractor3 = expected_sum + k

                    if norm_lang == "python":
                        code = f"total = 0\nfor i in range(1, {lim + 1}):\n    if i % 2 == 0:\n        total += i * {k}\nprint(total)"
                    elif norm_lang == "java":
                        code = f"int total = 0;\nfor (int i = 1; i <= {lim}; i++) {{\n    if (i % 2 == 0) total += i * {k};\n}}\nSystem.out.println(total);"
                    elif norm_lang == "c":
                        code = f"int total = 0;\nfor (int i = 1; i <= {lim}; i++) {{\n    if (i % 2 == 0) total += i * {k};\n}}\nprintf(\"%d\", total);"
                    else:
                        code = f"int total = 0;\nfor (int i = 1; i <= {lim}; i++) {{\n    if (i % 2 == 0) total += i * {k};\n}}\nstd::cout << total;"

                    return {
                        "question": f"What is the output of the following {norm_lang.upper()} code snippet?\n{code}",
                        "options": [
                            f"A) {expected_sum}",
                            f"B) {distractor1}",
                            f"C) {distractor2}",
                            f"D) {distractor3}",
                        ],
                        "correctAnswer": "A",
                        "explanation": f"The loop filters even numbers in 1..{lim} and accumulates i * {k}, resulting in {expected_sum}.",
                        "topic": "loops",
                        "difficulty": "medium",
                    }

                # 2. Debugging / Identify Bug
                elif q_type == 1:
                    size = (index % 3) + 4
                    if norm_lang == "python":
                        code = f"items = list(range({size}))\nfor i in range({size + 1}):\n    print(items[i])"
                        bug_desc = f"IndexError: list index out of range at index {size}"
                    elif norm_lang == "java":
                        code = f"int[] arr = new int[{size}];\nfor (int i = 0; i <= {size}; i++) {{\n    System.out.println(arr[i]);\n}}"
                        bug_desc = f"ArrayIndexOutOfBoundsException accessing index {size}"
                    elif norm_lang == "c":
                        code = f"int arr[{size}];\nfor (int i = 0; i <= {size}; i++) {{\n    printf(\"%d\\n\", arr[i]);\n}}"
                        bug_desc = f"Off-by-one buffer overrun accessing out-of-bounds index {size}"
                    else:
                        code = f"int arr[{size}];\nfor (int i = 0; i <= {size}; i++) {{\n    std::cout << arr[i] << \"\\n\";\n}}"
                        bug_desc = f"Off-by-one error: valid indices are 0 to {size - 1}, but loop attempts to access index {size}"

                    return {
                        "question": f"Which critical error or bug occurs in this {norm_lang.upper()} code snippet?\n{code}",
                        "options": [
                            f"A) {bug_desc}",
                            f"B) Infinite loop caused by unincremented loop counter",
                            f"C) Memory leak from unreleased heap allocation",
                            f"D) Syntax error in loop initialization header",
                        ],
                        "correctAnswer": "A",
                        "explanation": f"The loop boundary condition checks `<= {size}`, accessing one past the last valid index {size - 1}.",
                        "topic": "debugging",
                        "difficulty": "medium",
                    }

                # 3. Core Concepts / Algorithm Tracing (Array State)
                elif q_type == 2:
                    v0 = index + 2
                    v1 = index * 2 + 3
                    v2 = index + 5
                    computed = v0 + v1
                    if norm_lang == "python":
                        code = f"nums = [{v0}, {v1}, {v2}]\nnums[2] = nums[0] + nums[1]\nprint(nums[2])"
                    elif norm_lang == "java":
                        code = f"int[] nums = {{{v0}, {v1}, {v2}}};\nnums[2] = nums[0] + nums[1];\nSystem.out.println(nums[2]);"
                    elif norm_lang == "c":
                        code = f"int nums[] = {{{v0}, {v1}, {v2}}};\nnums[2] = nums[0] + nums[1];\nprintf(\"%d\", nums[2]);"
                    else:
                        code = f"int nums[] = {{{v0}, {v1}, {v2}}};\nnums[2] = nums[0] + nums[1];\nstd::cout << nums[2];"

                    return {
                        "question": f"What is the output after executing this {norm_lang.upper()} array mutation?\n{code}",
                        "options": [
                            f"A) {computed}",
                            f"B) {v2}",
                            f"C) {v0 * 2}",
                            f"D) {v1}",
                        ],
                        "correctAnswer": "A",
                        "explanation": f"nums[2] is updated with nums[0] ({v0}) + nums[1] ({v1}) = {computed}.",
                        "topic": "arrays",
                        "difficulty": "easy",
                    }

                # 4. Time / Space Complexity
                elif q_type == 3:
                    step_type = index % 2
                    if step_type == 0:
                        code = f"// Given input size N:\nfor (int i = 1; i <= N; i *= 2) {{\n    // O(1) operations\n}}"
                        compl = "O(log N)"
                        reason = "The loop counter doubles on every iteration, executing in logarithmic steps."
                    else:
                        code = f"// Given input size N:\nfor (int i = 0; i < N; i++) {{\n    for (int j = 0; j < N; j++) {{\n        // O(1) operations\n    }}\n}}"
                        compl = "O(N^2)"
                        reason = "Two nested loops each iterating N times produce N * N = N^2 operations."

                    return {
                        "question": f"What is the asymptotic time complexity of the following code snippet with respect to N?\n{code}",
                        "options": [
                            f"A) {compl}",
                            f"B) O(1)",
                            f"C) O(N log N)",
                            f"D) O(2^N)",
                        ],
                        "correctAnswer": "A",
                        "explanation": reason,
                        "topic": "complexity",
                        "difficulty": "medium",
                    }

                # 5. Practical Programming Logic / Recursion
                else:
                    k = (index % 3) + 3
                    rec_sum = sum(range(1, k + 1))
                    if norm_lang == "python":
                        code = f"def calc(n):\n    if n <= 1:\n        return 1\n    return n + calc(n - 1)\nprint(calc({k}))"
                    elif norm_lang == "java":
                        code = f"static int calc(int n) {{\n    if (n <= 1) return 1;\n    return n + calc(n - 1);\n}}\n// In main:\nSystem.out.println(calc({k}));"
                    elif norm_lang == "c":
                        code = f"int calc(int n) {{\n    if (n <= 1) return 1;\n    return n + calc(n - 1);\n}}\n// In main:\nprintf(\"%d\", calc({k}));"
                    else:
                        code = f"int calc(int n) {{\n    if (n <= 1) return 1;\n    return n + calc(n - 1);\n}}\n// In main:\nstd::cout << calc({k});"

                    return {
                        "question": f"What is the output of the recursive {norm_lang.upper()} function call below?\n{code}",
                        "options": [
                            f"A) {rec_sum}",
                            f"B) {rec_sum - 1}",
                            f"C) {k * 2}",
                            f"D) {k}",
                        ],
                        "correctAnswer": "A",
                        "explanation": f"calc({k}) recursively sums numbers from {k} down to 1 = {rec_sum}.",
                        "topic": "recursion",
                        "difficulty": "medium",
                    }

            # Select candidate pool strictly from requested (topics, target_lang)
            candidate_pool = []
            for t in target_topics:
                norm_t = map_topic_alias(t)
                key = (norm_t, target_lang)
                if key in topic_pools:
                    candidate_pool.extend(topic_pools[key])

            # Filter out excluded questions
            unseen_pool = [q for q in candidate_pool if normalize_text(q["question"]) not in excluded_set]

            # Collect unique questions
            chosen_questions = []
            seen_in_current_quiz = set()

            for q in unseen_pool:
                norm = normalize_text(q["question"])
                if norm not in seen_in_current_quiz:
                    seen_in_current_quiz.add(norm)
                    chosen_questions.append(q.copy())
                    if len(chosen_questions) == count:
                        break

            # If count is still not reached, dynamically synthesize STRICTLY topic-relevant + language-relevant questions
            fallback_index = 1
            primary_topic = target_topics[0] if target_topics else "loops"
            while len(chosen_questions) < count:
                dynamic_q = generate_topic_dynamic_question(primary_topic, target_lang, fallback_index)
                norm = normalize_text(dynamic_q["question"])
                if norm not in excluded_set and norm not in seen_in_current_quiz:
                    seen_in_current_quiz.add(norm)
                    chosen_questions.append(dynamic_q)
                fallback_index += 1

            # Shuffle and balance options across ALL chosen questions
            shuffled_questions = [_shuffle_question(q) for q in chosen_questions[:count]]

            return {"questions": shuffled_questions}

        if "personalized learning path" in prompt:
            import re
            # Extract weak topics from prompt if present
            weak_topics_match = re.search(r"WEAK TOPICS:\s*(\[[^\]]*\])", prompt)
            weak_topics = []
            if weak_topics_match:
                try:
                    weak_topics = json.loads(weak_topics_match.group(1))
                except Exception:
                    pass
            
            topics = weak_topics if weak_topics else ["loops", "arrays", "recursion"]
            steps = []
            for i, topic in enumerate(topics, 1):
                steps.append({
                    "step": i,
                    "topic": topic,
                    "priority": "HIGH" if i == 1 else ("MEDIUM" if i == 2 else "LOW"),
                    "estimatedTime": f"{30 * i}m",
                    "objective": f"Master core principles and common patterns for {topic}.",
                    "suggestedActivity": f"Solve targeted practice problems and quizzes on {topic}.",
                    "status": "IN_PROGRESS" if i == 1 else "PENDING",
                })

            return {
                "title": "Personalized Learning Path",
                "summary": f"Targeted roadmap focusing on {', '.join(topics)} to improve overall code quality and test pass rates.",
                "targetFocus": topics,
                "steps": steps,
            }

        if "weekly class report" in prompt:
            import re
            import json

            # Extract Class Name
            class_match = re.search(r"Class Name:\s*(.+)", prompt)
            class_name = class_match.group(1).strip() if class_match else "the class"

            # Extract Student Count
            sc_match = re.search(r"Student Count:\s*(\d+)", prompt)
            student_count = int(sc_match.group(1)) if sc_match else 0

            # Extract Average Score
            score_match = re.search(r"Average Score:\s*([\d\.]+)", prompt)
            avg_score = float(score_match.group(1)) if score_match else None

            # Extract Strong Topics
            strong_match = re.search(r"STRONG TOPICS:\s*(\[.*?\])", prompt, re.DOTALL)
            strong_topics = []
            if strong_match:
                try:
                    strong_topics = json.loads(strong_match.group(1))
                except Exception:
                    strong_topics = []

            # Extract Weak Topics
            weak_match = re.search(r"WEAK TOPICS:\s*(\[.*?\])", prompt, re.DOTALL)
            weak_topics = []
            if weak_match:
                try:
                    weak_topics = json.loads(weak_match.group(1))
                except Exception:
                    weak_topics = []

            # Extract At-Risk Students
            risk_match = re.search(r"AT-RISK STUDENTS:\s*(\[.*?\])", prompt, re.DOTALL)
            at_risk = []
            if risk_match:
                try:
                    at_risk = json.loads(risk_match.group(1))
                except Exception:
                    at_risk = []

            # Extract Topic Performance list
            topic_match = re.search(r"TOPIC PERFORMANCE:\s*(\[.*?\])", prompt, re.DOTALL)
            topic_perf = []
            if topic_match:
                try:
                    topic_perf = json.loads(topic_match.group(1))
                except Exception:
                    topic_perf = []

            # Derive strong and weak topics from topic_perf if empty
            if not strong_topics and topic_perf:
                strong_topics = [t["topic"] for t in topic_perf if t.get("averageScore", 0) >= 70]
            if not weak_topics and topic_perf:
                weak_topics = [t["topic"] for t in topic_perf if t.get("averageScore", 0) < 50]

            # Build formatted studentsNeedingAttention
            students_attention = []
            for s in at_risk:
                s_name = s.get("name", "Student")
                s_reason = s.get("reason")
                if not s_reason:
                    w = s.get("weakTopics", [])
                    if w:
                        s_reason = f"Low performance on {', '.join(w)}"
                    elif s.get("averageScore") is not None:
                        s_reason = f"Average score {s.get('averageScore')}% below expected threshold"
                    else:
                        s_reason = "Flagged for direct academic intervention"
                students_attention.append({
                    "name": s_name,
                    "reason": s_reason,
                })

            # Grounded summary and recommendations
            if student_count == 0 or (avg_score is None and not strong_topics and not weak_topics and not at_risk):
                summary = f"No student activity was recorded for {class_name} during this period."
                recommendations = [
                    "Encourage students to begin working on assigned laboratory exercises and quizzes.",
                    "Verify student enrollment and ensure assignments are published with active deadlines."
                ]
            else:
                score_str = f"an average score of {int(avg_score)}%" if avg_score is not None else "measured cohort progress"
                if weak_topics:
                    weak_str = ", ".join(weak_topics)
                    strong_str = f"strong performance in {', '.join(strong_topics)}" if strong_topics else "steady core participation"
                    summary = f"Class {class_name} recorded {score_str}. While {strong_str} was observed, {weak_str} represents a key vulnerability requiring targeted pedagogical focus."
                else:
                    strong_str = f"with consistent strength in {', '.join(strong_topics)}" if strong_topics else "across all evaluated topics"
                    summary = f"Class {class_name} achieved {score_str} {strong_str}, with no topics currently falling below the 50% vulnerability threshold."

                # Actionable recommendations grounded in detected weak concepts
                recommendations = []
                for wt in weak_topics:
                    wt_clean = str(wt).strip().lower()
                    if "recursion" in wt_clean:
                        recommendations.append(f"Dedicate a targeted lab session to call-stack visualization and base-case tracing for {wt}.")
                    elif "array" in wt_clean or "list" in wt_clean:
                        recommendations.append(f"Incorporate step-by-step memory model walkthroughs and boundary-checking exercises for {wt}.")
                    elif "loop" in wt_clean:
                        recommendations.append(f"Review loop termination conditions and off-by-one edge cases with interactive coding drills for {wt}.")
                    elif "tree" in wt_clean or "graph" in wt_clean:
                        recommendations.append(f"Provide visual traversal simulations and node-pointer relationship diagrams for {wt}.")
                    elif "sort" in wt_clean or "search" in wt_clean:
                        recommendations.append(f"Conduct live tracing sessions on partitioning and pivot comparisons for {wt}.")
                    else:
                        recommendations.append(f"Conduct targeted review and provide hands-on practice problems focusing on {wt}.")

                if not recommendations:
                    recommendations = [
                        "Introduce advanced optimization challenges and algorithmic problem sets to maintain engagement.",
                        "Incorporate peer code reviews to reinforce clean coding standards and test-driven design."
                    ]
                elif len(recommendations) == 1:
                    recommendations.append("Assign pair-programming exercises breaking down complex problems into smaller verifiable components.")

            return {
                "summary": summary,
                "strongTopics": strong_topics,
                "weakTopics": weak_topics,
                "studentsNeedingAttention": students_attention,
                "recommendations": recommendations,
            }

        if "performance report" in prompt:
            return {
                "overallScore": 65,
                "strengths": ["Arrays"],
                "weaknesses": ["Loops"],
                "summary": "The student understands arrays but needs more practice with loops.",
                "recommendations": [
                    "Practice loop-based problems daily",
                    "Review list iteration examples",
                ],
            }
        if "coding assignment" in prompt or "Target Topic:" in prompt:
            import re
            import json

            # Extract topic
            topic_match = re.search(r"Target Topic:\s*([a-zA-Z0-9_-]+)", prompt)
            topic = topic_match.group(1).lower().strip() if topic_match else "loops"

            # Extract language
            lang_match = re.search(r"Target Programming Language:\s*([a-zA-Z0-9_+#]+)", prompt)
            raw_lang = lang_match.group(1).lower().strip() if lang_match else "cpp"
            if raw_lang in ("c++", "cpp"):
                lang = "cpp"
            elif raw_lang in ("c",):
                lang = "c"
            elif raw_lang in ("java",):
                lang = "java"
            elif raw_lang in ("python", "py"):
                lang = "python"
            else:
                lang = "cpp"

            # Extract difficulty
            diff_match = re.search(r"Target Difficulty:\s*([a-zA-Z]+)", prompt)
            difficulty = diff_match.group(1).upper().strip() if diff_match else "MEDIUM"

            # Extract count
            count_match = re.search(r"Number of Questions:\s*(\d+)", prompt)
            q_count = int(count_match.group(1)) if count_match else 1

            # Extract excluded titles
            excluded_titles_raw = []
            exc_match = re.search(r"Excluded Titles.*?:?\s*(\[.*?\])", prompt, re.DOTALL)
            if exc_match:
                try:
                    excluded_titles_raw = json.loads(exc_match.group(1))
                except Exception:
                    excluded_titles_raw = []

            def _clean_text(t: str) -> str:
                if not t:
                    return ""
                cleaned = re.sub(r"[^\w\s]", "", str(t).lower())
                return " ".join(cleaned.split())

            def _is_candidate_excluded(candidate: dict, raw_exclusions: list) -> bool:
                cand_title = _clean_text(candidate.get("title", ""))
                cand_prob = _clean_text(candidate.get("problemStatement", ""))

                for exc in raw_exclusions:
                    if not exc:
                        continue
                    exc_str = str(exc)
                    exc_title_part = exc_str.split(":")[0] if ":" in exc_str else exc_str
                    exc_title = _clean_text(exc_title_part)
                    exc_prob = _clean_text(exc_str)

                    # Title match
                    if cand_title and exc_title:
                        if cand_title == exc_title or cand_title in exc_title or exc_title in cand_title:
                            return True

                    # Problem statement token overlap match
                    if cand_prob and exc_prob:
                        words_cand = set(cand_prob.split())
                        words_exc = set(exc_prob.split())
                        if words_cand and words_exc:
                            common = words_cand.intersection(words_exc)
                            min_len = min(len(words_cand), len(words_exc))
                            if min_len >= 3 and len(common) / min_len >= 0.7:
                                return True

                return False

            excluded_clean = {_clean_text(str(t).split(":")[0]) for t in excluded_titles_raw if t}

            # Starter code templates by language
            starter_templates = {
                "c": "#include <stdio.h>\n\nint main() {\n    // Read input and implement solution in C\n    \n    return 0;\n}\n",
                "cpp": "#include <iostream>\n#include <vector>\nusing namespace std;\n\nint main() {\n    // Read input and implement solution in C++\n    \n    return 0;\n}\n",
                "java": "import java.util.Scanner;\n\npublic class Solution {\n    public static void main(String[] args) {\n        Scanner sc = new Scanner(System.in);\n        // Read input and implement solution in Java\n        \n    }\n}\n",
                "python": "import sys\n\ndef solve():\n    # Read input from sys.stdin and implement solution in Python\n    pass\n\nif __name__ == '__main__':\n    solve()\n",
            }

            # Diverse Multi-Problem Catalog by (topic, difficulty) -> list of problems
            problem_pool = {
                "loops": {
                    "EASY": [
                        {
                            "title": "Sum of Even Numbers",
                            "description": f"Calculate the sum of all even integers from 1 to N using iterative loops in {lang.upper()}.",
                            "problemStatement": f"Given a positive integer N, write a program in {lang.upper()} that uses a loop to compute and print the sum of all even integers in the range [1, N].",
                            "constraints": ["1 <= N <= 10^5", "Output fits within a standard 64-bit integer"],
                            "inputFormat": "A single line containing the integer N.",
                            "outputFormat": "Print the sum of even numbers from 1 to N.",
                            "examples": [{"input": "10", "output": "30", "explanation": "Even numbers: 2 + 4 + 6 + 8 + 10 = 30."}],
                            "expectedConcepts": ["for loop", "while loop", "modulo operator", "accumulator"],
                            "testCases": [
                                {"input": "10", "expectedOutput": "30", "isHidden": False},
                                {"input": "2", "expectedOutput": "2", "isHidden": False},
                                {"input": "1", "expectedOutput": "0", "isHidden": True},
                                {"input": "20", "expectedOutput": "110", "isHidden": True},
                                {"input": "100", "expectedOutput": "2550", "isHidden": True},
                            ],
                            "hints": ["Initialize a sum variable to 0.", "Iterate from 2 to N with a step of 2 or check if i % 2 == 0."],
                            "explanation": "Iterate from 1 to N and sum all numbers divisible by 2."
                        },
                        {
                            "title": "Count Divisible Numbers in Range",
                            "description": f"Count how many integers between 1 and N are divisible by K in {lang.upper()}.",
                            "problemStatement": f"Given two positive integers N and K, write a program in {lang.upper()} using a loop to count and print the total number of integers from 1 to N that are evenly divisible by K.",
                            "constraints": ["1 <= N <= 10^6", "1 <= K <= N"],
                            "inputFormat": "A single line containing two space-separated integers N and K.",
                            "outputFormat": "Print the count of divisible integers.",
                            "examples": [{"input": "15 3", "output": "5", "explanation": "Numbers 3, 6, 9, 12, 15 are divisible by 3."}],
                            "expectedConcepts": ["loop counter", "modulo arithmetic", "step iteration"],
                            "testCases": [
                                {"input": "15 3", "expectedOutput": "5", "isHidden": False},
                                {"input": "10 5", "expectedOutput": "2", "isHidden": False},
                                {"input": "7 10", "expectedOutput": "0", "isHidden": True},
                                {"input": "100 7", "expectedOutput": "14", "isHidden": True},
                            ],
                            "hints": ["Iterate from 1 to N and check if i % K == 0, incrementing a count."],
                            "explanation": "Scan from 1 to N with a loop and tally numbers whose remainder modulo K is 0."
                        },
                        {
                            "title": "Sum of Digits of an Integer",
                            "description": f"Calculate the sum of all digits of a positive integer N in {lang.upper()}.",
                            "problemStatement": f"Given a positive integer N, write a program in {lang.upper()} using a while loop to extract each digit and compute the sum of its digits.",
                            "constraints": ["1 <= N <= 10^9"],
                            "inputFormat": "A single line containing the integer N.",
                            "outputFormat": "Print the sum of digits of N.",
                            "examples": [{"input": "4321", "output": "10", "explanation": "4 + 3 + 2 + 1 = 10."}],
                            "expectedConcepts": ["while loop", "digit extraction (N % 10)", "integer division (N / 10)"],
                            "testCases": [
                                {"input": "4321", "expectedOutput": "10", "isHidden": False},
                                {"input": "9", "expectedOutput": "9", "isHidden": False},
                                {"input": "1000", "expectedOutput": "1", "isHidden": True},
                                {"input": "9999", "expectedOutput": "36", "isHidden": True},
                            ],
                            "hints": ["Use `N % 10` to get the last digit, add to sum, and do `N = N / 10` until N is 0."],
                            "explanation": "Repeatedly extract the lowest digit with modulo 10 and accumulate."
                        },
                        {
                            "title": "Factorial Accumulator via Iteration",
                            "description": f"Compute factorial N! using an iterative loop in {lang.upper()}.",
                            "problemStatement": f"Given a non-negative integer N (0 <= N <= 12), calculate N! (N factorial = 1 * 2 * ... * N) using an iterative loop.",
                            "constraints": ["0 <= N <= 12"],
                            "inputFormat": "A single line containing integer N.",
                            "outputFormat": "Print N!.",
                            "examples": [{"input": "5", "output": "120", "explanation": "1 * 2 * 3 * 4 * 5 = 120."}],
                            "expectedConcepts": ["for loop", "product accumulation", "base case handling (0! = 1)"],
                            "testCases": [
                                {"input": "5", "expectedOutput": "120", "isHidden": False},
                                {"input": "0", "expectedOutput": "1", "isHidden": False},
                                {"input": "1", "expectedOutput": "1", "isHidden": True},
                                {"input": "6", "expectedOutput": "720", "isHidden": True},
                            ],
                            "hints": ["Initialize result = 1. If N > 1, multiply result by i for i from 2 to N."],
                            "explanation": "Iterate from 1 to N multiplying into an accumulator variable."
                        }
                    ],
                    "MEDIUM": [
                        {
                            "title": "Nested Number Triangle Pattern",
                            "description": f"Generate a right-angled numerical pattern using nested loops in {lang.upper()}.",
                            "problemStatement": f"Given an integer N, generate a right-angled numerical triangle of height N where row i contains numbers 1 through i separated by a space.",
                            "constraints": ["1 <= N <= 50"],
                            "inputFormat": "A single integer N.",
                            "outputFormat": "N lines representing the number pattern.",
                            "examples": [{"input": "3", "output": "1\n1 2\n1 2 3", "explanation": "Row 1: 1, Row 2: 1 2, Row 3: 1 2 3."}],
                            "expectedConcepts": ["nested loops", "outer loop row counter", "inner loop column counter"],
                            "testCases": [
                                {"input": "3", "expectedOutput": "1\n1 2\n1 2 3", "isHidden": False},
                                {"input": "1", "expectedOutput": "1", "isHidden": False},
                                {"input": "4", "expectedOutput": "1\n1 2\n1 2 3\n1 2 3 4", "isHidden": True},
                                {"input": "2", "expectedOutput": "1\n1 2", "isHidden": True},
                            ],
                            "hints": ["Use an outer loop from 1 to N for rows.", "Use an inner loop from 1 to current row for printing numbers."],
                            "explanation": "Nested loops where outer loop controls line count and inner loop prints sequential numbers."
                        },
                        {
                            "title": "Prime Number Verification",
                            "description": f"Determine whether an integer N is a prime number using loops in {lang.upper()}.",
                            "problemStatement": f"Given an integer N (N >= 2), write a program in {lang.upper()} using a loop to test if N is prime. Print 'YES' if prime, or 'NO' otherwise.",
                            "constraints": ["2 <= N <= 10^9"],
                            "inputFormat": "A single integer N.",
                            "outputFormat": "Print 'YES' or 'NO'.",
                            "examples": [{"input": "7", "output": "YES", "explanation": "7 has no divisors other than 1 and 7."}],
                            "expectedConcepts": ["trial division", "loop optimization (i * i <= N)", "boolean flag"],
                            "testCases": [
                                {"input": "7", "expectedOutput": "YES", "isHidden": False},
                                {"input": "4", "expectedOutput": "NO", "isHidden": False},
                                {"input": "2", "expectedOutput": "YES", "isHidden": True},
                                {"input": "29", "expectedOutput": "YES", "isHidden": True},
                                {"input": "100", "expectedOutput": "NO", "isHidden": True},
                            ],
                            "hints": ["Check divisors from 2 up to sqrt(N). If any divides N evenly, N is not prime."],
                            "explanation": "Trial division loop checking for divisibility up to square root of N."
                        },
                        {
                            "title": "Reverse Integer Digits and Palindrome Check",
                            "description": f"Reverse the digits of integer N and determine if N is a palindrome in {lang.upper()}.",
                            "problemStatement": f"Given a positive integer N, reverse its digits using a while loop. Output the reversed integer and whether it matches the original (print 'PALINDROME' or 'NOT PALINDROME').",
                            "constraints": ["1 <= N <= 10^9"],
                            "inputFormat": "A single integer N.",
                            "outputFormat": "First line: reversed integer. Second line: 'PALINDROME' or 'NOT PALINDROME'.",
                            "examples": [{"input": "1221", "output": "1221\nPALINDROME", "explanation": "1221 reversed is 1221, so it is a palindrome."}],
                            "expectedConcepts": ["while loop", "arithmetic reversal", "comparison logic"],
                            "testCases": [
                                {"input": "1221", "expectedOutput": "1221\nPALINDROME", "isHidden": False},
                                {"input": "123", "expectedOutput": "321\nNOT PALINDROME", "isHidden": False},
                                {"input": "7", "expectedOutput": "7\nPALINDROME", "isHidden": True},
                                {"input": "100", "expectedOutput": "1\nNOT PALINDROME", "isHidden": True},
                            ],
                            "hints": ["rev = rev * 10 + (temp % 10) inside a while temp > 0 loop."],
                            "explanation": "Reconstruct number in reverse using standard arithmetic manipulation."
                        },
                        {
                            "title": "Harmonic Series Partial Sum",
                            "description": f"Compute the sum of first N terms of the harmonic series in {lang.upper()}.",
                            "problemStatement": f"Given an integer N, compute the harmonic series sum H(N) = 1 + 1/2 + 1/3 + ... + 1/N using a loop. Print the result formatted to 2 decimal places.",
                            "constraints": ["1 <= N <= 10^5"],
                            "inputFormat": "A single integer N.",
                            "outputFormat": "Print the harmonic sum rounded to 2 decimal places.",
                            "examples": [{"input": "4", "output": "2.08", "explanation": "1 + 0.5 + 0.333 + 0.25 = 2.0833... -> 2.08"}],
                            "expectedConcepts": ["floating point accumulation", "type casting in division", "precision formatting"],
                            "testCases": [
                                {"input": "4", "expectedOutput": "2.08", "isHidden": False},
                                {"input": "1", "expectedOutput": "1.00", "isHidden": False},
                                {"input": "10", "expectedOutput": "2.93", "isHidden": True},
                            ],
                            "hints": ["Cast denominator to double/float before division to avoid integer truncation."],
                            "explanation": "Loop from 1 to N adding 1.0 / i to a double accumulator."
                        }
                    ],
                    "HARD": [
                        {
                            "title": "Collatz Sequence Cycle Length",
                            "description": f"Compute the stopping time and peak value of Collatz sequence using loops in {lang.upper()}.",
                            "problemStatement": f"Given a starting integer N, apply the Collatz rules (if N is even: N = N/2, if N is odd: N = 3N + 1) in a loop until N reaches 1. Output the total number of steps.",
                            "constraints": ["1 <= N <= 10^6"],
                            "inputFormat": "A single integer N.",
                            "outputFormat": "Print the number of transformation steps to reach 1.",
                            "examples": [{"input": "6", "output": "8", "explanation": "Sequence: 6 -> 3 -> 10 -> 5 -> 16 -> 8 -> 4 -> 2 -> 1 (8 steps)."}],
                            "expectedConcepts": ["while loop", "conditional state updates", "infinite loop prevention"],
                            "testCases": [
                                {"input": "6", "expectedOutput": "8", "isHidden": False},
                                {"input": "1", "expectedOutput": "0", "isHidden": False},
                                {"input": "13", "expectedOutput": "9", "isHidden": True},
                                {"input": "27", "expectedOutput": "111", "isHidden": True},
                            ],
                            "hints": ["Use a while loop with condition `n != 1`.", "Keep a counter for the steps."],
                            "explanation": "Iteratively transform N according to parity rules until reaching 1 while counting steps."
                        },
                        {
                            "title": "Greatest Common Divisor via Euclidean Loop",
                            "description": f"Compute GCD of two large integers using iterative Euclidean algorithm in {lang.upper()}.",
                            "problemStatement": f"Given two positive integers A and B, compute their Greatest Common Divisor (GCD) using an iterative while loop implementing Euclid's algorithm.",
                            "constraints": ["1 <= A, B <= 10^9"],
                            "inputFormat": "Two space-separated integers A and B.",
                            "outputFormat": "Print the GCD of A and B.",
                            "examples": [{"input": "48 18", "output": "6", "explanation": "The greatest common divisor of 48 and 18 is 6."}],
                            "expectedConcepts": ["Euclidean algorithm", "while loop with remainder swap", "modulo arithmetic"],
                            "testCases": [
                                {"input": "48 18", "expectedOutput": "6", "isHidden": False},
                                {"input": "100 25", "expectedOutput": "25", "isHidden": False},
                                {"input": "17 13", "expectedOutput": "1", "isHidden": True},
                                {"input": "1000000 500000", "expectedOutput": "500000", "isHidden": True},
                            ],
                            "hints": ["While B != 0: temp = B; B = A % B; A = temp. Result is A."],
                            "explanation": "Iterative Euclidean modulo reduction until remainder is zero."
                        },
                        {
                            "title": "Diamond Pattern Generator",
                            "description": f"Generate a symmetric star diamond pattern of size N in {lang.upper()}.",
                            "problemStatement": f"Given an integer N, print a diamond shape consisting of 2N-1 rows using nested loops with proper space padding and asterisk characters.",
                            "constraints": ["1 <= N <= 20"],
                            "inputFormat": "A single integer N.",
                            "outputFormat": "2N-1 lines displaying the diamond pattern.",
                            "examples": [{"input": "2", "output": " *\n***\n *", "explanation": "Diamond of size 2 has 3 rows."}],
                            "expectedConcepts": ["nested loops", "space padding calculation", "symmetric row iteration"],
                            "testCases": [
                                {"input": "2", "expectedOutput": " *\n***\n *", "isHidden": False},
                                {"input": "1", "expectedOutput": "*", "isHidden": False},
                            ],
                            "hints": ["For row i from 1 to N: print N-i spaces then 2i-1 stars. Then do the bottom half in reverse."],
                            "explanation": "Use two outer loops (upper half and lower half) controlling space and star counts."
                        }
                    ]
                },
                "arrays": {
                    "EASY": [
                        {
                            "title": "Array Element Frequency Counter",
                            "description": f"Count the occurrences of a target element in an array using {lang.upper()}.",
                            "problemStatement": f"Given an array of N integers and a target value K, write a program in {lang.upper()} to count how many times K appears in the array.",
                            "constraints": ["1 <= N <= 10^5", "-10^9 <= elements, K <= 10^9"],
                            "inputFormat": "First line contains N and K. Second line contains N space-separated integers.",
                            "outputFormat": "Print the count of occurrences of K.",
                            "examples": [{"input": "5 2\n1 2 2 4 2", "output": "3", "explanation": "2 appears 3 times in the array."}],
                            "expectedConcepts": ["array traversal", "linear scan", "counter"],
                            "testCases": [
                                {"input": "5 2\n1 2 2 4 2", "expectedOutput": "3", "isHidden": False},
                                {"input": "3 9\n1 2 3", "expectedOutput": "0", "isHidden": False},
                                {"input": "1 5\n5", "expectedOutput": "1", "isHidden": True},
                                {"input": "4 -1\n-1 -1 -1 -1", "expectedOutput": "4", "isHidden": True},
                            ],
                            "hints": ["Iterate over each array element and increment your count if element == K."],
                            "explanation": "Scan the array and count elements matching target K."
                        },
                        {
                            "title": "Find Minimum and Maximum in Array",
                            "description": f"Find both minimum and maximum elements in an integer array in {lang.upper()}.",
                            "problemStatement": f"Given an array of N integers, find the smallest and largest values in the array and print them separated by a space.",
                            "constraints": ["1 <= N <= 10^5", "-10^9 <= arr[i] <= 10^9"],
                            "inputFormat": "First line contains N. Second line contains N space-separated integers.",
                            "outputFormat": "Print 'MIN MAX'.",
                            "examples": [{"input": "5\n3 1 9 4 7", "output": "1 9", "explanation": "Min is 1, max is 9."}],
                            "expectedConcepts": ["single pass scan", "min/max tracking", "initialization with first element"],
                            "testCases": [
                                {"input": "5\n3 1 9 4 7", "expectedOutput": "1 9", "isHidden": False},
                                {"input": "1\n42", "expectedOutput": "42 42", "isHidden": False},
                                {"input": "4\n-10 -20 -5 -30", "expectedOutput": "-30 -5", "isHidden": True},
                            ],
                            "hints": ["Initialize min_val and max_val to arr[0], then update during traversal."],
                            "explanation": "Traverse the array once, updating min and max bounds."
                        }
                    ],
                    "MEDIUM": [
                        {
                            "title": "Array Prefix Sum Array",
                            "description": f"Compute the prefix sum array for rapid range queries in {lang.upper()}.",
                            "problemStatement": f"Given an array of N integers, compute its prefix sum array where prefix[i] is the sum of elements from index 0 to i.",
                            "constraints": ["1 <= N <= 10^5"],
                            "inputFormat": "First line contains N. Second line contains N integers.",
                            "outputFormat": "Print N space-separated prefix sums.",
                            "examples": [{"input": "4\n1 2 3 4", "output": "1 3 6 10", "explanation": "Prefix sums: 1, 1+2=3, 1+2+3=6, 1+2+3+4=10."}],
                            "expectedConcepts": ["prefix sum", "cumulative array accumulation"],
                            "testCases": [
                                {"input": "4\n1 2 3 4", "expectedOutput": "1 3 6 10", "isHidden": False},
                                {"input": "1\n5", "expectedOutput": "5", "isHidden": False},
                                {"input": "3\n10 -5 20", "expectedOutput": "10 5 25", "isHidden": True},
                            ],
                            "hints": ["prefix[i] = prefix[i-1] + arr[i]"],
                            "explanation": "Maintain a running cumulative total across array indices."
                        },
                        {
                            "title": "Rotate Array by K Positions",
                            "description": f"Rotate an array of N elements to the right by K positions in {lang.upper()}.",
                            "problemStatement": f"Given an array of N integers and a non-negative integer K, rotate the array to the right by K positions and print the resulting array.",
                            "constraints": ["1 <= N <= 10^5", "0 <= K <= 10^9"],
                            "inputFormat": "First line contains N and K. Second line contains N integers.",
                            "outputFormat": "Print the rotated array elements separated by spaces.",
                            "examples": [{"input": "5 2\n1 2 3 4 5", "output": "4 5 1 2 3", "explanation": "Rotating right by 2 moves 4, 5 to the front."}],
                            "expectedConcepts": ["modulo indexing (K % N)", "array reversal or cyclic shifts"],
                            "testCases": [
                                {"input": "5 2\n1 2 3 4 5", "expectedOutput": "4 5 1 2 3", "isHidden": False},
                                {"input": "4 4\n10 20 30 40", "expectedOutput": "10 20 30 40", "isHidden": False},
                                {"input": "3 1\n1 2 3", "expectedOutput": "3 1 2", "isHidden": True},
                            ],
                            "hints": ["K = K % N. You can reverse the entire array, then reverse first K elements, then remaining N-K."],
                            "explanation": "Effective rotation using modulo normalization and block displacement."
                        }
                    ],
                    "HARD": [
                        {
                            "title": "Maximum Subarray Sum (Kadane's Algorithm)",
                            "description": f"Find the maximum contiguous subarray sum in {lang.upper()}.",
                            "problemStatement": f"Given an array of N integers, find the contiguous subarray with the largest sum and print that sum.",
                            "constraints": ["1 <= N <= 10^5", "-10^4 <= arr[i] <= 10^4"],
                            "inputFormat": "First line contains N. Second line contains N space-separated integers.",
                            "outputFormat": "Print the maximum subarray sum.",
                            "examples": [{"input": "5\n-2 1 -3 4 -1", "output": "4", "explanation": "Subarray [4] gives max sum 4."}],
                            "expectedConcepts": ["Kadane algorithm", "dynamic programming on arrays"],
                            "testCases": [
                                {"input": "5\n-2 1 -3 4 -1", "expectedOutput": "4", "isHidden": False},
                                {"input": "4\n-1 -2 -3 -4", "expectedOutput": "-1", "isHidden": False},
                                {"input": "6\n1 2 3 -2 5 1", "expectedOutput": "10", "isHidden": True},
                            ],
                            "hints": ["Keep track of max_so_far and max_ending_here."],
                            "explanation": "Use Kadane's algorithm to compute maximum contiguous sum in O(N)."
                        },
                        {
                            "title": "Dutch National Flag Three-Way Partition",
                            "description": f"Sort an array of 0s, 1s, and 2s in-place in linear time in {lang.upper()}.",
                            "problemStatement": f"Given an array containing only 0s, 1s, and 2s, sort the array in ascending order in O(N) time with O(1) extra space.",
                            "constraints": ["1 <= N <= 10^5", "arr[i] in {0, 1, 2}"],
                            "inputFormat": "First line contains N. Second line contains N space-separated integers.",
                            "outputFormat": "Print the sorted array elements separated by spaces.",
                            "examples": [{"input": "6\n2 0 2 1 1 0", "output": "0 0 1 1 2 2", "explanation": "All 0s first, then 1s, then 2s."}],
                            "expectedConcepts": ["three pointers (low, mid, high)", "in-place swapping", "linear partition"],
                            "testCases": [
                                {"input": "6\n2 0 2 1 1 0", "expectedOutput": "0 0 1 1 2 2", "isHidden": False},
                                {"input": "3\n2 1 0", "expectedOutput": "0 1 2", "isHidden": False},
                                {"input": "4\n1 1 1 1", "expectedOutput": "1 1 1 1", "isHidden": True},
                            ],
                            "hints": ["Use low=0, mid=0, high=N-1. Swap mid with low on 0, mid with high on 2."],
                            "explanation": "Dutch National Flag algorithm partitioning into three segments in one pass."
                        }
                    ]
                },
                "recursion": {
                    "EASY": [
                        {
                            "title": "Recursive Factorial Calculation",
                            "description": f"Compute factorial of N using recursion in {lang.upper()}.",
                            "problemStatement": f"Given a non-negative integer N (0 <= N <= 12), write a recursive function in {lang.upper()} to calculate N! (N factorial).",
                            "constraints": ["0 <= N <= 12"],
                            "inputFormat": "A single integer N.",
                            "outputFormat": "Print N!.",
                            "examples": [{"input": "5", "output": "120", "explanation": "5! = 5 * 4 * 3 * 2 * 1 = 120."}],
                            "expectedConcepts": ["base case", "recursive case", "call stack"],
                            "testCases": [
                                {"input": "5", "expectedOutput": "120", "isHidden": False},
                                {"input": "0", "expectedOutput": "1", "isHidden": False},
                                {"input": "1", "expectedOutput": "1", "isHidden": True},
                                {"input": "6", "expectedOutput": "720", "isHidden": True},
                            ],
                            "hints": ["Base case: if N <= 1 return 1.", "Recursive step: return N * fact(N - 1)."],
                            "explanation": "Define base case for 0/1 and recursively multiply N by fact(N - 1)."
                        },
                        {
                            "title": "Recursive Sum of Natural Numbers",
                            "description": f"Calculate the sum of first N natural numbers recursively in {lang.upper()}.",
                            "problemStatement": f"Given a positive integer N, write a recursive function in {lang.upper()} that computes 1 + 2 + ... + N without using loops.",
                            "constraints": ["1 <= N <= 1000"],
                            "inputFormat": "A single integer N.",
                            "outputFormat": "Print the sum.",
                            "examples": [{"input": "5", "output": "15", "explanation": "1 + 2 + 3 + 4 + 5 = 15."}],
                            "expectedConcepts": ["base case N == 1", "recurrence relation sum(N) = N + sum(N-1)"],
                            "testCases": [
                                {"input": "5", "expectedOutput": "15", "isHidden": False},
                                {"input": "1", "expectedOutput": "1", "isHidden": False},
                                {"input": "10", "expectedOutput": "55", "isHidden": True},
                            ],
                            "hints": ["If N == 1 return 1; otherwise return N + sumNatural(N - 1)."],
                            "explanation": "Recursively decompose the sum problem down to base case 1."
                        }
                    ],
                    "MEDIUM": [
                        {
                            "title": "Recursive Fibonacci Number",
                            "description": f"Compute the N-th Fibonacci number using recursion in {lang.upper()}.",
                            "problemStatement": f"Write a recursive function in {lang.upper()} that returns the N-th Fibonacci number (F(0)=0, F(1)=1, F(N)=F(N-1)+F(N-2)).",
                            "constraints": ["0 <= N <= 30"],
                            "inputFormat": "A single integer N.",
                            "outputFormat": "Print F(N).",
                            "examples": [{"input": "6", "output": "8", "explanation": "F(6) = 8 (0, 1, 1, 2, 3, 5, 8)."}],
                            "expectedConcepts": ["tree recursion", "base cases F(0) and F(1)"],
                            "testCases": [
                                {"input": "6", "expectedOutput": "8", "isHidden": False},
                                {"input": "0", "expectedOutput": "0", "isHidden": False},
                                {"input": "1", "expectedOutput": "1", "isHidden": True},
                                {"input": "10", "expectedOutput": "55", "isHidden": True},
                            ],
                            "hints": ["Base cases: if N == 0 return 0, if N == 1 return 1."],
                            "explanation": "Recursive branches compute F(N-1) + F(N-2)."
                        },
                        {
                            "title": "Recursive Fast Exponentiation",
                            "description": f"Compute X^N in O(log N) using recursive divide-and-conquer in {lang.upper()}.",
                            "problemStatement": f"Given base X and non-negative integer power N, compute X^N recursively using fast exponentiation (power(X, N) = power(X, N/2)^2).",
                            "constraints": ["1 <= X <= 20", "0 <= N <= 30"],
                            "inputFormat": "Two space-separated integers X and N.",
                            "outputFormat": "Print X^N.",
                            "examples": [{"input": "2 10", "output": "1024", "explanation": "2^10 = 1024."}],
                            "expectedConcepts": ["divide and conquer", "logarithmic recursion depth"],
                            "testCases": [
                                {"input": "2 10", "expectedOutput": "1024", "isHidden": False},
                                {"input": "5 0", "expectedOutput": "1", "isHidden": False},
                                {"input": "3 4", "expectedOutput": "81", "isHidden": True},
                            ],
                            "hints": ["If N == 0 return 1. If N is even: half = power(X, N/2); return half * half."],
                            "explanation": "Recursively square the half power to achieve O(log N) steps."
                        }
                    ],
                    "HARD": [
                        {
                            "title": "Recursive Tower of Hanoi Step Counter",
                            "description": f"Solve Tower of Hanoi and count total moves recursively in {lang.upper()}.",
                            "problemStatement": f"Given N disks on peg A, calculate the minimum number of moves required to transfer all disks to peg C following standard rules.",
                            "constraints": ["1 <= N <= 30"],
                            "inputFormat": "A single integer N.",
                            "outputFormat": "Print the minimum moves count (2^N - 1).",
                            "examples": [{"input": "3", "output": "7", "explanation": "2^3 - 1 = 7 moves."}],
                            "expectedConcepts": ["divide and conquer recursion", "recurrence relations"],
                            "testCases": [
                                {"input": "3", "expectedOutput": "7", "isHidden": False},
                                {"input": "1", "expectedOutput": "1", "isHidden": False},
                                {"input": "4", "expectedOutput": "15", "isHidden": True},
                                {"input": "5", "expectedOutput": "31", "isHidden": True},
                            ],
                            "hints": ["hanoi(N) = 2 * hanoi(N-1) + 1 with hanoi(1) = 1."],
                            "explanation": "Recursively compute moves by transferring N-1 disks twice plus 1 move for largest disk."
                        }
                    ]
                },
                "searching": {
                    "EASY": [
                        {
                            "title": "Linear Search in Array",
                            "description": f"Implement linear search to find first index of target in {lang.upper()}.",
                            "problemStatement": f"Given N integers and a target value K, find the 0-based index of the first occurrence of K. If not present, print -1.",
                            "constraints": ["1 <= N <= 10^5"],
                            "inputFormat": "First line contains N and K. Second line contains N space-separated integers.",
                            "outputFormat": "Print the index of K or -1.",
                            "examples": [{"input": "5 7\n2 4 7 9 7", "output": "2", "explanation": "First occurrence of 7 is at index 2."}],
                            "expectedConcepts": ["sequential scan", "early return"],
                            "testCases": [
                                {"input": "5 7\n2 4 7 9 7", "expectedOutput": "2", "isHidden": False},
                                {"input": "3 10\n1 2 3", "expectedOutput": "-1", "isHidden": False},
                                {"input": "1 4\n4", "expectedOutput": "0", "isHidden": True},
                            ],
                            "hints": ["Iterate from 0 to N-1 and return i when arr[i] == K."],
                            "explanation": "Sequential search checking each index until match found."
                        }
                    ],
                    "MEDIUM": [
                        {
                            "title": "Binary Search on Sorted Array",
                            "description": f"Implement logarithmic binary search on sorted array in {lang.upper()}.",
                            "problemStatement": f"Given a sorted array of N unique integers and target K, implement binary search in O(log N) to find 0-based index of K or -1.",
                            "constraints": ["1 <= N <= 10^5", "Array is sorted in strictly ascending order"],
                            "inputFormat": "First line contains N and K. Second line contains N sorted integers.",
                            "outputFormat": "Print index or -1.",
                            "examples": [{"input": "5 12\n2 5 8 12 16", "output": "3", "explanation": "12 is at index 3."}],
                            "expectedConcepts": ["binary search", "two pointers left and right", "midpoint calculation"],
                            "testCases": [
                                {"input": "5 12\n2 5 8 12 16", "expectedOutput": "3", "isHidden": False},
                                {"input": "4 1\n2 4 6 8", "expectedOutput": "-1", "isHidden": False},
                                {"input": "6 99\n10 20 30 40 50 99", "expectedOutput": "5", "isHidden": True},
                            ],
                            "hints": ["Calculate mid = left + (right - left) / 2.", "Narrow search boundary to left or right half."],
                            "explanation": "Binary search repeatedly cuts sorted search space in half."
                        },
                        {
                            "title": "Find First and Last Position of Element in Sorted Array",
                            "description": f"Find both starting and ending index of a target value in a sorted array in {lang.upper()}.",
                            "problemStatement": f"Given a sorted array of N integers with potential duplicates, find the first and last occurrence index of target K. If target is not present, print '-1 -1'.",
                            "constraints": ["1 <= N <= 10^5"],
                            "inputFormat": "First line contains N and K. Second line contains N sorted integers.",
                            "outputFormat": "Print 'FIRST_INDEX LAST_INDEX'.",
                            "examples": [{"input": "6 8\n5 7 7 8 8 10", "output": "3 4", "explanation": "8 starts at index 3 and ends at index 4."}],
                            "expectedConcepts": ["binary search variations", "lower bound", "upper bound"],
                            "testCases": [
                                {"input": "6 8\n5 7 7 8 8 10", "expectedOutput": "3 4", "isHidden": False},
                                {"input": "4 6\n1 2 3 4", "expectedOutput": "-1 -1", "isHidden": False},
                                {"input": "1 5\n5", "expectedOutput": "0 0", "isHidden": True},
                            ],
                            "hints": ["Run binary search once to find leftmost match, and again for rightmost match."],
                            "explanation": "Two binary search passes: one biassing left and one biassing right."
                        }
                    ],
                    "HARD": [
                        {
                            "title": "Search in Rotated Sorted Array",
                            "description": f"Locate target in a rotated sorted array in O(log N) in {lang.upper()}.",
                            "problemStatement": f"Given a sorted array of distinct integers rotated at some pivot unknown beforehand, find the index of target K in O(log N), or -1.",
                            "constraints": ["1 <= N <= 10^5"],
                            "inputFormat": "First line contains N and K. Second line contains N rotated sorted integers.",
                            "outputFormat": "Print index of target K or -1.",
                            "examples": [{"input": "7 0\n4 5 6 7 0 1 2", "output": "4", "explanation": "0 is at index 4."}],
                            "expectedConcepts": ["modified binary search", "pivot detection"],
                            "testCases": [
                                {"input": "7 0\n4 5 6 7 0 1 2", "expectedOutput": "4", "isHidden": False},
                                {"input": "5 3\n5 1 2 3 4", "expectedOutput": "3", "isHidden": False},
                                {"input": "3 10\n4 5 1", "expectedOutput": "-1", "isHidden": True},
                            ],
                            "hints": ["One half (left or right of mid) is always normally sorted. Check if target lies in that sorted half."],
                            "explanation": "Identify the sorted half of the array at each step to narrow the search range."
                        }
                    ]
                }
            }

            # Select appropriate topic bucket or fallback
            topic_key = topic if topic in problem_pool else "loops"
            diff_key = difficulty if difficulty in ("EASY", "MEDIUM", "HARD") else "MEDIUM"

            candidates = problem_pool.get(topic_key, {}).get(diff_key, [])
            
            # Filter candidates to exclude already generated/excluded problems (by title AND problem statement)
            valid_candidates = [p for p in candidates if not _is_candidate_excluded(p, excluded_titles_raw)]

            # If all candidates in current diff are excluded, check other diffs in same topic
            if not valid_candidates:
                for alt_diff in ["EASY", "MEDIUM", "HARD"]:
                    if alt_diff != diff_key:
                        alt_list = [p for p in problem_pool.get(topic_key, {}).get(alt_diff, []) if not _is_candidate_excluded(p, excluded_titles_raw)]
                        if alt_list:
                            valid_candidates = alt_list
                            break

            # If still none, check other topics
            if not valid_candidates:
                for alt_top in ["loops", "arrays", "searching", "recursion"]:
                    for alt_diff in ["EASY", "MEDIUM", "HARD"]:
                        alt_list = [p for p in problem_pool.get(alt_top, {}).get(alt_diff, []) if not _is_candidate_excluded(p, excluded_titles_raw)]
                        if alt_list:
                            valid_candidates = alt_list
                            break
                    if valid_candidates:
                        break

            # Pick a deterministic yet distinct candidate
            if valid_candidates:
                pick_idx = len(excluded_titles_raw) % len(valid_candidates)
                base_problem = valid_candidates[pick_idx]
            else:
                # Ultimate safety fallback with genuinely unique title AND problem statement
                seq = len(excluded_titles_raw) + 1
                base_problem = {
                    "title": f"Algorithmic Problem Challenge #{seq}",
                    "description": f"Solve a custom algorithmic challenge focusing on {topic}.",
                    "problemStatement": f"Write a program in {lang.upper()} to process an integer parameter N (N >= 1) and output the transformed result for challenge sequence {seq}.",
                    "constraints": ["1 <= N <= 10^4"],
                    "inputFormat": "A single line containing integer N.",
                    "outputFormat": "Print the calculated output integer.",
                    "examples": [{"input": "5", "output": str(5 * seq), "explanation": f"Calculated result for challenge sequence {seq}."}],
                    "expectedConcepts": [topic, "custom logic"],
                    "testCases": [
                        {"input": "5", "expectedOutput": str(5 * seq), "isHidden": False},
                        {"input": "1", "expectedOutput": str(1 * seq), "isHidden": False},
                        {"input": "10", "expectedOutput": str(10 * seq), "isHidden": True},
                    ],
                    "hints": ["Implement the custom transformation logic step by step."],
                    "explanation": "Iterative processing of input N according to challenge sequence constraints."
                }

            final_title = base_problem["title"]
            if _clean_text(final_title) in excluded_clean:
                final_title = f"{final_title} Variation {len(excluded_clean) + 1}"

            res = {
                "title": final_title,
                "description": base_problem["description"],
                "language": lang,
                "difficulty": difficulty,
                "topics": [topic],
                "problemStatement": base_problem["problemStatement"],
                "constraints": base_problem["constraints"],
                "inputFormat": base_problem["inputFormat"],
                "outputFormat": base_problem["outputFormat"],
                "examples": base_problem["examples"],
                "expectedConcepts": base_problem["expectedConcepts"],
                "testCases": base_problem["testCases"],
                "starterCode": starter_templates.get(lang, starter_templates["cpp"]),
                "hints": base_problem["hints"],
                "explanation": base_problem["explanation"],
            }

            if q_count > 1:
                questions_list = []
                diff_levels = ["EASY", "MEDIUM", "HARD"]
                for i in range(q_count):
                    d = diff_levels[i % len(diff_levels)]
                    d_candidates = problem_pool.get(topic_key, {}).get(d, [base_problem])
                    prob = d_candidates[i % len(d_candidates)]
                    questions_list.append({
                        "title": f"Q{i+1}: {prob['title']}",
                        "problemStatement": prob["problemStatement"],
                        "topic": topic,
                        "language": lang,
                        "difficulty": d,
                        "constraints": prob["constraints"],
                        "inputFormat": prob["inputFormat"],
                        "outputFormat": prob["outputFormat"],
                        "examples": prob["examples"],
                        "testCases": prob["testCases"],
                        "starterCode": starter_templates.get(lang, starter_templates["cpp"]),
                        "hints": prob["hints"],
                        "explanation": prob["explanation"],
                    })
                res["questions"] = questions_list

            return res

        if "NEXT BEST ACTION" in prompt:
            import os
            action = os.getenv("MOCK_AGENT_ACTION", "ASSIGN_PRACTICE")
            return {
                "action": action,
                "targetTopics": ["loops"],
                "difficulty": "easy",
                "questionCount": 3,
                "reason": "Student has made repeated boundary errors in loops",
                "confidence": 0.90
            }

        if "ALLOWED_TOPICS:" in prompt or "AI programming tutor analyzing a student's code submission" in prompt:
            import json
            import re

            # Extract allowed topics from prompt
            allowed_topics = []
            if "ALLOWED_TOPICS:" in prompt:
                try:
                    start_idx = prompt.index("ALLOWED_TOPICS:")
                    json_start = prompt.index("[", start_idx)
                    json_end = prompt.index("]", json_start) + 1
                    allowed_topics = json.loads(prompt[json_start:json_end])
                except Exception:
                    pass

            if not allowed_topics:
                allowed_topics = ["basics"]

            # Extract passed and failed test case counts
            passed_match = re.search(r"Passed:\s*(\d+)", prompt)
            failed_match = re.search(r"Failed:\s*(\d+)", prompt)
            passed_count = int(passed_match.group(1)) if passed_match else 1
            failed_count = int(failed_match.group(1)) if failed_match else 0

            # Extract language
            lang_match = re.search(r"Language:\s*([a-zA-Z0-9_\+#]+)", prompt)
            lang_str = lang_match.group(1).strip() if lang_match else "code"

            primary_topic = allowed_topics[0] if allowed_topics else "programming"

            if failed_count == 0 and passed_count > 0:
                # All tests passed! High mastery, no weak topics or mistakes
                mastery_list = [
                    {"topic": topic, "score": min(100, 88 + (idx * 4) % 10)}
                    for idx, topic in enumerate(allowed_topics)
                ]
                return {
                    "mastery": mastery_list,
                    "weakTopics": [],
                    "mistakes": [],
                    "recommendations": [
                        f"Optimal implementation in {lang_str}. Solution successfully passed all automated test cases.",
                        f"Demonstrated strong mastery of {primary_topic}. Consider exploring additional edge cases or optimizing space complexity.",
                    ],
                }
            else:
                # Some or all tests failed
                mastery_list = [
                    {"topic": topic, "score": max(20, 42 - (idx * 5) % 18)}
                    for idx, topic in enumerate(allowed_topics)
                ]
                return {
                    "mastery": mastery_list,
                    "weakTopics": allowed_topics,
                    "mistakes": [
                        f"Logic or boundary check discrepancy detected during {lang_str} test runner execution.",
                        f"Failed {failed_count} automated test case{'s' if failed_count > 1 else ''}. Check loop invariants, edge conditions, or output formatting.",
                    ],
                    "recommendations": [
                        f"Step through your {primary_topic} logic with boundary inputs (such as 0, 1, or maximum bounds).",
                        f"Review {primary_topic} syntax and algorithmic patterns to ensure all test constraints are satisfied.",
                    ],
                }

        return {
            "mastery": [{"topic": "loops", "score": 40}],
            "weakTopics": ["loops"],
            "mistakes": [
                "Possible index out of range error",
                "Loop boundary is incorrect",
            ],
            "recommendations": [
                "Practice loop boundaries",
                "Check list indexes before accessing elements",
            ],
        }
