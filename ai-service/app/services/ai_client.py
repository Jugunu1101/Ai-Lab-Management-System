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

            match = re.search(r"Generate exactly (\d+)", prompt)
            count = int(match.group(1)) if match else 10

            # Extract target topics
            target_topics = ["basics", "logic", "syntax"]
            if "Use only these topics:" in prompt:
                try:
                    start_idx = prompt.index("Use only these topics:")
                    json_start = prompt.index("[", start_idx)
                    json_end = prompt.index("]", json_start) + 1
                    target_topics = json.loads(prompt[json_start:json_end])
                except Exception:
                    pass

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

            # Comprehensive Question Pool by (Topic, Language)
            topic_pools = {
                ("loops", "cpp"): [
                    {"question": "In C++, which loop header correctly executes 5 iterations with a counter starting at 0?", "options": ["A) for (int i = 0; i < 5; i++)", "B) for (int i = 0; i <= 5; i++)", "C) for (int i = 1; i <= 5)", "D) repeat (5)"], "correctAnswer": "A", "explanation": "In C++, standard for loops follow `for (initialization; condition; increment)`.", "topic": "loops", "difficulty": "easy"},
                    {"question": "What is the output of the following C++ code snippet:\nint sum = 0;\nfor (int i = 1; i <= 3; i++) {\n    sum += i;\n}\nstd::cout << sum;", "options": ["A) 6", "B) 3", "C) 10", "D) 4"], "correctAnswer": "A", "explanation": "1 + 2 + 3 = 6.", "topic": "loops", "difficulty": "easy"},
                    {"question": "In C++, what does the `break;` statement do inside a while loop?", "options": ["A) Immediately terminates the nearest enclosing loop", "B) Skips to the next iteration", "C) Restarts the loop from index 0", "D) Exits the entire function"], "correctAnswer": "A", "explanation": "The break statement terminates execution of the innermost enclosing loop in C++.", "topic": "loops", "difficulty": "easy"},
                    {"question": "In C++, what does the `continue;` statement do inside a for loop?", "options": ["A) Skips the rest of the current iteration and evaluates the increment step", "B) Terminates the loop", "C) Pauses loop execution", "D) Repeats the current iteration without advancing"], "correctAnswer": "A", "explanation": "continue jumps directly to the loop increment/step expression in C++.", "topic": "loops", "difficulty": "easy"},
                    {"question": "What is the output of this C++ while loop:\nint x = 1;\nwhile (x < 8) {\n    x *= 2;\n}\nstd::cout << x;", "options": ["A) 8", "B) 4", "C) 16", "D) 7"], "correctAnswer": "A", "explanation": "x takes values 1 -> 2 -> 4 -> 8. At 8, 8 < 8 is false.", "topic": "loops", "difficulty": "medium"},
                    {"question": "In C++11 and later, what is the syntax for a range-based for loop over `std::vector<int> vec`?", "options": ["A) for (int x : vec)", "B) for (int x in vec)", "C) foreach (int x in vec)", "D) for (int x from vec)"], "correctAnswer": "A", "explanation": "Range-based for in C++ uses `for (type var : range)`.", "topic": "loops", "difficulty": "easy"},
                    {"question": "What is the output of the nested C++ loop:\nint count = 0;\nfor (int i = 0; i < 2; i++) {\n    for (int j = 0; j < 3; j++) {\n        count++;\n    }\n}\nstd::cout << count;", "options": ["A) 6", "B) 5", "C) 9", "D) 23"], "correctAnswer": "A", "explanation": "Outer loop runs 2 times, inner loop runs 3 times: 2 * 3 = 6.", "topic": "loops", "difficulty": "medium"},
                    {"question": "What is the output of the C++ do-while loop:\nint i = 5;\ndo {\n    i++;\n} while (i < 5);\nstd::cout << i;", "options": ["A) 6", "B) 5", "C) 0", "D) Infinite loop"], "correctAnswer": "A", "explanation": "A do-while loop executes its body once before evaluating the condition (5 -> 6).", "topic": "loops", "difficulty": "medium"},
                    {"question": "What is the output of this C++ loop with break:\nint sum = 0;\nfor (int i = 1; i <= 5; i++) {\n    if (i == 3) break;\n    sum += i;\n}\nstd::cout << sum;", "options": ["A) 3", "B) 6", "C) 15", "D) 0"], "correctAnswer": "A", "explanation": "i=1: sum=1; i=2: sum=3; i=3: break. Output is 3.", "topic": "loops", "difficulty": "medium"},
                    {"question": "What is the output of this C++ loop with continue:\nint sum = 0;\nfor (int i = 1; i <= 4; i++) {\n    if (i % 2 == 0) continue;\n    sum += i;\n}\nstd::cout << sum;", "options": ["A) 4", "B) 10", "C) 6", "D) 1"], "correctAnswer": "A", "explanation": "continue skips 2 and 4. Sum of 1 + 3 = 4.", "topic": "loops", "difficulty": "medium"},
                ],
                ("loops", "c"): [
                    {"question": "In C, which loop construct is guaranteed to execute its body at least once?", "options": ["A) do-while loop", "B) for loop", "C) while loop", "D) goto loop"], "correctAnswer": "A", "explanation": "do-while checks its condition after running the body, guaranteeing at least one execution.", "topic": "loops", "difficulty": "easy"},
                    {"question": "What is the output of the C code snippet:\nint sum = 0;\nfor (int i = 1; i < 4; i++) {\n    sum += i;\n}\nprintf(\"%d\", sum);", "options": ["A) 6", "B) 10", "C) 3", "D) 4"], "correctAnswer": "A", "explanation": "Loop sums 1 + 2 + 3 = 6.", "topic": "loops", "difficulty": "easy"},
                    {"question": "In C, what is the effect of the `break;` statement inside a loop?", "options": ["A) Immediately exits the innermost enclosing loop", "B) Skips the current iteration", "C) Restarts the loop counter", "D) Returns 0 from main()"], "correctAnswer": "A", "explanation": "break exits the innermost active loop in C.", "topic": "loops", "difficulty": "easy"},
                    {"question": "In C, what is the output of:\nint a = 1;\nwhile (a < 10) {\n    a += 3;\n}\nprintf(\"%d\", a);", "options": ["A) 10", "B) 9", "C) 13", "D) 7"], "correctAnswer": "A", "explanation": "a: 1 -> 4 -> 7 -> 10. When a=10, 10 < 10 is false, so loop terminates.", "topic": "loops", "difficulty": "medium"},
                    {"question": "In C, how do you write a standard infinite loop using `for`?", "options": ["A) for (;;) { ... }", "B) for (while 1) { ... }", "C) for (int i = 0) { ... }", "D) loop (infinite) { ... }"], "correctAnswer": "A", "explanation": "for (;;) produces an infinite loop in standard C.", "topic": "loops", "difficulty": "easy"},
                    {"question": "What is the output of the C nested loop:\nint k = 0;\nfor (int i = 0; i < 3; i++) {\n    for (int j = 0; j < 2; j++) {\n        k += 2;\n    }\n}\nprintf(\"%d\", k);", "options": ["A) 12", "B) 6", "C) 8", "D) 10"], "correctAnswer": "A", "explanation": "Loop runs 3 * 2 = 6 times, adding 2 each time: 6 * 2 = 12.", "topic": "loops", "difficulty": "medium"},
                    {"question": "What does `continue;` do in a C while loop?", "options": ["A) Jumps immediately to the loop condition evaluation", "B) Terminate the loop", "C) Breaks out of the function", "D) Clears all variables"], "correctAnswer": "A", "explanation": "continue skips the remaining body and evaluates the while condition.", "topic": "loops", "difficulty": "easy"},
                    {"question": "What is the output of the C code:\nint x = 0;\nfor (int i = 0; i < 5; i++) {\n    if (i == 2) continue;\n    x += i;\n}\nprintf(\"%d\", x);", "options": ["A) 8", "B) 10", "C) 6", "D) 0"], "correctAnswer": "A", "explanation": "0 + 1 + 3 + 4 = 8 (2 is skipped by continue).", "topic": "loops", "difficulty": "medium"},
                ],
                ("loops", "java"): [
                    {"question": "In Java, what is the output of the following loop:\nint sum = 0;\nfor (int i = 1; i <= 3; i++) {\n    sum += i * 2;\n}\nSystem.out.println(sum);", "options": ["A) 12", "B) 6", "C) 10", "D) 8"], "correctAnswer": "A", "explanation": "2 + 4 + 6 = 12.", "topic": "loops", "difficulty": "easy"},
                    {"question": "In Java, which enhanced for loop (for-each) correctly iterates over an array `int[] numbers`?", "options": ["A) for (int num : numbers)", "B) for (int num in numbers)", "C) foreach (int num in numbers)", "D) for (num <- numbers)"], "correctAnswer": "A", "explanation": "Java uses `for (Type var : arrayOrIterable)` for enhanced for-each loops.", "topic": "loops", "difficulty": "easy"},
                    {"question": "What is the output of the Java while loop:\nint val = 1;\nwhile (val < 16) {\n    val *= 2;\n}\nSystem.out.println(val);", "options": ["A) 16", "B) 8", "C) 32", "D) 15"], "correctAnswer": "A", "explanation": "val doubles: 1 -> 2 -> 4 -> 8 -> 16. At 16, 16 < 16 is false.", "topic": "loops", "difficulty": "medium"},
                    {"question": "In Java, what does the `break;` statement do inside an unlabelled nested for loop?", "options": ["A) Terminates only the innermost loop", "B) Terminates all outer loops", "C) Skips the current iteration", "D) Throws a BreakException"], "correctAnswer": "A", "explanation": "An unlabelled break terminates only the innermost loop containing it.", "topic": "loops", "difficulty": "easy"},
                    {"question": "In Java, what does the `continue;` statement do in a for loop?", "options": ["A) Transfers control to the update expression of the current loop", "B) Exits the loop", "C) Stops the thread execution", "D) Resets the loop index to 0"], "correctAnswer": "A", "explanation": "continue skips the rest of the body and runs the update step.", "topic": "loops", "difficulty": "easy"},
                    {"question": "What is the output of the Java do-while loop:\nint count = 0;\ndo {\n    count += 3;\n} while (count < 9);\nSystem.out.println(count);", "options": ["A) 9", "B) 6", "C) 12", "D) 3"], "correctAnswer": "A", "explanation": "count: 0 -> 3 -> 6 -> 9. When count is 9, 9 < 9 is false.", "topic": "loops", "difficulty": "medium"},
                    {"question": "What is the output of the Java loop with break:\nint res = 0;\nfor (int i = 1; i <= 10; i++) {\n    if (i > 3) break;\n    res += i;\n}\nSystem.out.println(res);", "options": ["A) 6", "B) 10", "C) 55", "D) 3"], "correctAnswer": "A", "explanation": "Adds 1 + 2 + 3 = 6, breaks when i reaches 4.", "topic": "loops", "difficulty": "medium"},
                ],
                ("loops", "python"): [
                    {"question": "Which Python loop header iterates over numbers 0 through 4?", "options": ["A) for i in range(5):", "B) loop i from 0 to 4:", "C) while (i < 5):", "D) repeat 5:"], "correctAnswer": "A", "explanation": "range(5) produces 0, 1, 2, 3, 4 in Python.", "topic": "loops", "difficulty": "easy"},
                    {"question": "What sequence of integers does range(1, 6, 2) produce in Python?", "options": ["A) 1, 3, 5", "B) 1, 2, 3, 4, 5", "C) 2, 4, 6", "D) 1, 3"], "correctAnswer": "A", "explanation": "range(start, stop, step) starts at 1, steps by 2, and stops before 6: 1, 3, 5.", "topic": "loops", "difficulty": "easy"},
                    {"question": "What is the output of the Python loop:\ntotal = 0\nfor i in range(1, 4):\n    total += i\nprint(total)", "options": ["A) 6", "B) 10", "C) 3", "D) 7"], "correctAnswer": "A", "explanation": "1 + 2 + 3 = 6.", "topic": "loops", "difficulty": "easy"},
                    {"question": "What does enumerate(['a', 'b']) yield in a Python for loop?", "options": ["A) (0, 'a'), (1, 'b')", "B) ('a', 0), ('b', 1)", "C) [0, 1]", "D) ['a', 'b']"], "correctAnswer": "A", "explanation": "enumerate() produces (index, item) tuples.", "topic": "loops", "difficulty": "easy"},
                    {"question": "In Python, what does the `else` clause attached to a `for` loop do?", "options": ["A) Executes when the loop finishes iterating without encountering a break", "B) Executes only on break", "C) Executes on every iteration", "D) Causes a SyntaxError"], "correctAnswer": "A", "explanation": "Loop else runs when the loop completes naturally without break.", "topic": "loops", "difficulty": "medium"},
                    {"question": "What is the output of the Python while loop:\nx = 1\nwhile x < 8:\n    x *= 2\nprint(x)", "options": ["A) 8", "B) 4", "C) 16", "D) 7"], "correctAnswer": "A", "explanation": "1 -> 2 -> 4 -> 8. When x is 8, 8 < 8 is False.", "topic": "loops", "difficulty": "medium"},
                    {"question": "What is the output of the Python loop:\ns = 0\nfor i in range(5):\n    if i % 2 == 0:\n        continue\n    s += i\nprint(s)", "options": ["A) 4", "B) 9", "C) 6", "D) 10"], "correctAnswer": "A", "explanation": "continue skips evens 0, 2, 4. 1 + 3 = 4.", "topic": "loops", "difficulty": "medium"},
                ],
                ("arrays", "cpp"): [
                    {"question": "In C++, which standard container provides a dynamic contiguous array?", "options": ["A) std::vector", "B) std::list", "C) std::set", "D) std::map"], "correctAnswer": "A", "explanation": "std::vector is a dynamic contiguous array in C++.", "topic": "arrays", "difficulty": "easy"},
                    {"question": "What is the time complexity of accessing an element by index in a C++ `std::vector`?", "options": ["A) O(1)", "B) O(n)", "C) O(log n)", "D) O(n^2)"], "correctAnswer": "A", "explanation": "Vector index access uses direct pointer arithmetic, taking O(1) time.", "topic": "arrays", "difficulty": "easy"},
                    {"question": "Which method adds an element to the end of a `std::vector` in C++?", "options": ["A) vec.push_back(x)", "B) vec.append(x)", "C) vec.add(x)", "D) vec.insert_end(x)"], "correctAnswer": "A", "explanation": "push_back() appends elements to a std::vector in C++.", "topic": "arrays", "difficulty": "easy"},
                    {"question": "In C++, what does `vec.pop_back()` do on a non-empty `std::vector`?", "options": ["A) Removes the last element", "B) Removes the first element", "C) Clears the vector", "D) Returns the size"], "correctAnswer": "A", "explanation": "pop_back() destroys the last element of the vector.", "topic": "arrays", "difficulty": "easy"},
                ],
                ("arrays", "c"): [
                    {"question": "In C, if `int arr[5] = {10, 20, 30, 40, 50};`, what is the value of `arr[2]`?", "options": ["A) 30", "B) 20", "C) 10", "D) 40"], "correctAnswer": "A", "explanation": "C arrays are 0-indexed: index 2 is the 3rd element, 30.", "topic": "arrays", "difficulty": "easy"},
                    {"question": "In C, what is the relationship between array name `arr` and pointers?", "options": ["A) `arr` decays into a pointer to its first element `&arr[0]`", "B) `arr` is an integer value", "C) `arr` is dynamically resized", "D) `arr` cannot be indexed with pointers"], "correctAnswer": "A", "explanation": "In most expressions, an array name decays to a pointer to its first element.", "topic": "arrays", "difficulty": "medium"},
                    {"question": "What is the time complexity of accessing `arr[i]` in a C array?", "options": ["A) O(1)", "B) O(n)", "C) O(log n)", "D) O(n^2)"], "correctAnswer": "A", "explanation": "C array indexing computes address via base + i * sizeof(type) in O(1) time.", "topic": "arrays", "difficulty": "easy"},
                ],
                ("arrays", "java"): [
                    {"question": "In Java, how do you declare and initialize an integer array of size 5?", "options": ["A) int[] arr = new int[5];", "B) int arr[5];", "C) Array<int> arr = new Array(5);", "D) int arr = new int[5];"], "correctAnswer": "A", "explanation": "`int[] arr = new int[5];` allocates a 5-element integer array in Java.", "topic": "arrays", "difficulty": "easy"},
                    {"question": "Which property gives the number of elements in a Java array `int[] arr`?", "options": ["A) arr.length", "B) arr.length()", "C) arr.size()", "D) arr.count"], "correctAnswer": "A", "explanation": "Java arrays have a final field `length`.", "topic": "arrays", "difficulty": "easy"},
                    {"question": "Which class in `java.util` provides a resizable array implementation in Java?", "options": ["A) ArrayList", "B) ArrayVector", "C) DynamicArray", "D) LinkedList"], "correctAnswer": "A", "explanation": "ArrayList is Java's standard resizable array collection.", "topic": "arrays", "difficulty": "easy"},
                ],
                ("arrays", "python"): [
                    {"question": "Which data structure in Python represents an ordered, mutable sequence of elements?", "options": ["A) list", "B) set", "C) tuple", "D) dict"], "correctAnswer": "A", "explanation": "Lists in Python are ordered and mutable sequences.", "topic": "arrays", "difficulty": "easy"},
                    {"question": "What is the output of `[10, 20, 30, 40][1:3]` in Python?", "options": ["A) [20, 30]", "B) [10, 20]", "C) [20, 30, 40]", "D) [10, 30]"], "correctAnswer": "A", "explanation": "Slice [1:3] extracts elements at index 1 and 2: [20, 30].", "topic": "arrays", "difficulty": "easy"},
                    {"question": "Which method appends a single element to the end of a list in Python?", "options": ["A) list.append(x)", "B) list.push(x)", "C) list.add(x)", "D) list.insert_end(x)"], "correctAnswer": "A", "explanation": "append() adds an item to the end of a Python list.", "topic": "arrays", "difficulty": "easy"},
                ],
                ("recursion", "cpp"): [
                    {"question": "What is the primary requirement for a recursive function in C++ to terminate safely?", "options": ["A) A well-defined base case", "B) A while loop inside the body", "C) A global pointer", "D) Dynamic heap allocation"], "correctAnswer": "A", "explanation": "A base case stops recursive calls before call stack exhaustion.", "topic": "recursion", "difficulty": "medium"},
                    {"question": "What is the output of the C++ recursive function:\nint fact(int n) {\n    if (n <= 1) return 1;\n    return n * fact(n - 1);\n}\n// std::cout << fact(4);", "options": ["A) 24", "B) 12", "C) 16", "D) 4"], "correctAnswer": "A", "explanation": "4 * 3 * 2 * 1 = 24.", "topic": "recursion", "difficulty": "medium"},
                ],
                ("recursion", "c"): [
                    {"question": "In C, what memory structure stores function call stack frames during recursive execution?", "options": ["A) Call stack", "B) Heap memory", "C) Data segment", "D) BSS segment"], "correctAnswer": "A", "explanation": "The call stack manages local variables and return addresses for each call frame.", "topic": "recursion", "difficulty": "medium"},
                    {"question": "What is the output of the C recursive function:\nint sum(int n) {\n    if (n == 0) return 0;\n    return n + sum(n - 1);\n}\n// printf(\"%d\", sum(3));", "options": ["A) 6", "B) 3", "C) 5", "D) 0"], "correctAnswer": "A", "explanation": "3 + 2 + 1 + 0 = 6.", "topic": "recursion", "difficulty": "medium"},
                ],
                ("recursion", "java"): [
                    {"question": "In Java, what exception is thrown when recursive method calls exceed the stack limit?", "options": ["A) StackOverflowError", "B) RecursionException", "C) MemoryLimitException", "D) InfiniteLoopException"], "correctAnswer": "A", "explanation": "Java throws java.lang.StackOverflowError when call depth exceeds stack capacity.", "topic": "recursion", "difficulty": "medium"},
                    {"question": "What is the output of the Java recursive method:\npublic static int count(int n) {\n    if (n <= 1) return 1;\n    return n + count(n - 1);\n}\n// System.out.println(count(4));", "options": ["A) 10", "B) 8", "C) 24", "D) 4"], "correctAnswer": "A", "explanation": "4 + 3 + 2 + 1 = 10.", "topic": "recursion", "difficulty": "medium"},
                ],
                ("recursion", "python"): [
                    {"question": "What exception is raised in Python when recursive calls exceed the maximum call stack depth?", "options": ["A) RecursionError", "B) StackOverflowException", "C) MemoryExhaustedError", "D) InfiniteLoopError"], "correctAnswer": "A", "explanation": "Python raises RecursionError when max recursion depth is exceeded.", "topic": "recursion", "difficulty": "medium"},
                    {"question": "What is the output of the Python recursive function:\ndef fact(n):\n    if n <= 1: return 1\n    return n * fact(n - 1)\nprint(fact(4))", "options": ["A) 24", "B) 12", "C) 16", "D) 4"], "correctAnswer": "A", "explanation": "4 * 3 * 2 * 1 = 24.", "topic": "recursion", "difficulty": "medium"},
                ],
                ("searching", "cpp"): [
                    {"question": "In C++, which standard algorithm performs binary search on a sorted container?", "options": ["A) std::binary_search", "B) std::find_sorted", "C) std::search_binary", "D) std::lookup"], "correctAnswer": "A", "explanation": "std::binary_search in `<algorithm>` tests if an element exists in a sorted range.", "topic": "searching", "difficulty": "easy"},
                    {"question": "What is the worst-case time complexity of Binary Search on a sorted array of n elements?", "options": ["A) O(log n)", "B) O(n)", "C) O(n^2)", "D) O(1)"], "correctAnswer": "A", "explanation": "Binary search halves the search space each step: O(log n).", "topic": "searching", "difficulty": "easy"},
                ],
                ("searching", "c"): [
                    {"question": "In C, which standard library function in `<stdlib.h>` performs binary search on a sorted array?", "options": ["A) bsearch()", "B) binsearch()", "C) search()", "D) lsearch()"], "correctAnswer": "A", "explanation": "bsearch() is the standard C library binary search function.", "topic": "searching", "difficulty": "medium"},
                    {"question": "What is the worst-case time complexity of Linear Search on an array of size n in C?", "options": ["A) O(n)", "B) O(log n)", "C) O(1)", "D) O(n log n)"], "correctAnswer": "A", "explanation": "Linear search inspects every element sequentially in O(n) time.", "topic": "searching", "difficulty": "easy"},
                ],
                ("searching", "java"): [
                    {"question": "In Java, which standard method in `java.util.Arrays` performs binary search on a sorted array?", "options": ["A) Arrays.binarySearch()", "B) Arrays.find()", "C) Arrays.search()", "D) Arrays.lookup()"], "correctAnswer": "A", "explanation": "Arrays.binarySearch() performs binary search on sorted Java arrays.", "topic": "searching", "difficulty": "easy"},
                    {"question": "What is the time complexity of Binary Search on a sorted Java array of n elements?", "options": ["A) O(log n)", "B) O(n)", "C) O(n^2)", "D) O(1)"], "correctAnswer": "A", "explanation": "Binary search achieves O(log n) time complexity.", "topic": "searching", "difficulty": "easy"},
                ],
                ("searching", "python"): [
                    {"question": "Which search algorithm requires the sequence elements to be in sorted order in Python?", "options": ["A) Binary Search", "B) Linear Search", "C) Breadth First Search", "D) Depth First Search"], "correctAnswer": "A", "explanation": "Binary search relies on sorted ordering to eliminate half the search space.", "topic": "searching", "difficulty": "easy"},
                    {"question": "What module in Python provides binary search functions like `bisect_left` and `bisect_right`?", "options": ["A) bisect", "B) binary", "C) search", "D) algorithm"], "correctAnswer": "A", "explanation": "The bisect module provides binary search algorithms in Python standard library.", "topic": "searching", "difficulty": "easy"},
                ]
            }

            def generate_topic_dynamic_question(topic_name: str, lang: str, index: int) -> dict:
                norm_topic = topic_name.lower().strip()
                norm_lang = lang.lower().strip()

                if norm_topic == "loops":
                    if norm_lang == "cpp":
                        n = index + 3
                        return {
                            "question": f"What is the output of the following C++ code:\nint total = 0;\nfor (int i = 1; i < {n}; i++) {{\n    total += i * 2;\n}}\nstd::cout << total;",
                            "options": [
                                f"A) {sum(i * 2 for i in range(1, n))}",
                                f"B) {sum(i * 2 for i in range(1, n - 1))}",
                                f"C) {sum(i for i in range(1, n))}",
                                f"D) {sum(i * 2 for i in range(1, n + 1))}",
                            ],
                            "correctAnswer": "A",
                            "explanation": f"The C++ for loop iterates for i from 1 to {n - 1}, summing i * 2 to {sum(i * 2 for i in range(1, n))}.",
                            "topic": "loops",
                            "difficulty": "medium",
                        }
                    elif norm_lang == "c":
                        n = index + 3
                        return {
                            "question": f"What is the output of the following C code:\nint sum = 0;\nfor (int i = 1; i < {n}; i++) {{\n    sum += i * 3;\n}}\nprintf(\"%d\", sum);",
                            "options": [
                                f"A) {sum(i * 3 for i in range(1, n))}",
                                f"B) {sum(i * 3 for i in range(1, n - 1))}",
                                f"C) {sum(i for i in range(1, n))}",
                                f"D) {sum(i * 3 for i in range(1, n + 1))}",
                            ],
                            "correctAnswer": "A",
                            "explanation": f"The C for loop runs from 1 to {n - 1}, summing i * 3 to {sum(i * 3 for i in range(1, n))}.",
                            "topic": "loops",
                            "difficulty": "medium",
                        }
                    elif norm_lang == "java":
                        n = index + 3
                        return {
                            "question": f"What is the output of the following Java loop:\nint count = 0;\nfor (int i = 1; i < {n}; i++) {{\n    count += i * 2;\n}}\nSystem.out.println(count);",
                            "options": [
                                f"A) {sum(i * 2 for i in range(1, n))}",
                                f"B) {sum(i * 2 for i in range(1, n - 1))}",
                                f"C) {sum(i for i in range(1, n))}",
                                f"D) {sum(i * 2 for i in range(1, n + 1))}",
                            ],
                            "correctAnswer": "A",
                            "explanation": f"The Java for loop iterates from 1 to {n - 1}, accumulating {sum(i * 2 for i in range(1, n))}.",
                            "topic": "loops",
                            "difficulty": "medium",
                        }
                    else:  # python
                        n = index + 3
                        return {
                            "question": f"What is the output of the following Python loop:\ntotal = 0\nfor i in range(1, {n}):\n    total += i * 2\nprint(total)",
                            "options": [
                                f"A) {sum(i * 2 for i in range(1, n))}",
                                f"B) {sum(i * 2 for i in range(1, n - 1))}",
                                f"C) {sum(i for i in range(1, n))}",
                                f"D) {sum(i * 2 for i in range(1, n + 1))}",
                            ],
                            "correctAnswer": "A",
                            "explanation": f"Python range(1, {n}) iterates 1 through {n - 1}, giving sum {sum(i * 2 for i in range(1, n))}.",
                            "topic": "loops",
                            "difficulty": "medium",
                        }

                elif norm_topic == "arrays":
                    if norm_lang == "cpp":
                        return {
                            "question": f"In C++, what is the value of `vec[2]` given `std::vector<int> vec = {{{index * 2}, {index * 2 + 5}, {index * 2 + 10}, {index * 2 + 15}}};`?",
                            "options": [
                                f"A) {index * 2 + 10}",
                                f"B) {index * 2 + 5}",
                                f"C) {index * 2 + 15}",
                                f"D) {index * 2}",
                            ],
                            "correctAnswer": "A",
                            "explanation": f"Index 2 in the C++ vector accesses the 3rd element: {index * 2 + 10}.",
                            "topic": "arrays",
                            "difficulty": "easy",
                        }
                    elif norm_lang == "c":
                        return {
                            "question": f"In C, what is the value of `arr[1]` given `int arr[4] = {{{index * 3}, {index * 3 + 7}, {index * 3 + 14}, {index * 3 + 21}}};`?",
                            "options": [
                                f"A) {index * 3 + 7}",
                                f"B) {index * 3}",
                                f"C) {index * 3 + 14}",
                                f"D) {index * 3 + 21}",
                            ],
                            "correctAnswer": "A",
                            "explanation": f"Index 1 in C array accesses the 2nd element: {index * 3 + 7}.",
                            "topic": "arrays",
                            "difficulty": "easy",
                        }
                    elif norm_lang == "java":
                        return {
                            "question": f"In Java, what is the value of `nums[2]` given `int[] nums = {{{index * 4}, {index * 4 + 2}, {index * 4 + 6}, {index * 4 + 8}}};`?",
                            "options": [
                                f"A) {index * 4 + 6}",
                                f"B) {index * 4 + 2}",
                                f"C) {index * 4 + 8}",
                                f"D) {index * 4}",
                            ],
                            "correctAnswer": "A",
                            "explanation": f"Index 2 in Java array accesses the 3rd element: {index * 4 + 6}.",
                            "topic": "arrays",
                            "difficulty": "easy",
                        }
                    else:
                        return {
                            "question": f"In Python, what is the value of `nums[2]` given `nums = [{index * 3}, {index * 3 + 5}, {index * 3 + 10}, {index * 3 + 15}]`?",
                            "options": [
                                f"A) {index * 3 + 10}",
                                f"B) {index * 3 + 5}",
                                f"C) {index * 3 + 15}",
                                f"D) {index * 3}",
                            ],
                            "correctAnswer": "A",
                            "explanation": f"Index 2 in Python list accesses the 3rd element: {index * 3 + 10}.",
                            "topic": "arrays",
                            "difficulty": "easy",
                        }

                elif norm_topic == "recursion":
                    n = index + 2
                    if norm_lang == "cpp":
                        return {
                            "question": f"What is the output of the C++ recursive function:\nint rec(int n) {{\n    if (n <= 1) return 1;\n    return n + rec(n - 1);\n}}\n// std::cout << rec({n});",
                            "options": [
                                f"A) {sum(range(1, n + 1))}",
                                f"B) {sum(range(1, n))}",
                                f"C) {n * 2}",
                                f"D) {n}",
                            ],
                            "correctAnswer": "A",
                            "explanation": f"rec({n}) recursively computes {n} + ... + 1 = {sum(range(1, n + 1))}.",
                            "topic": "recursion",
                            "difficulty": "medium",
                        }
                    elif norm_lang == "c":
                        return {
                            "question": f"What is the output of the C recursive function:\nint rec(int n) {{\n    if (n <= 1) return 1;\n    return n + rec(n - 1);\n}}\n// printf(\"%d\", rec({n}));",
                            "options": [
                                f"A) {sum(range(1, n + 1))}",
                                f"B) {sum(range(1, n))}",
                                f"C) {n * 2}",
                                f"D) {n}",
                            ],
                            "correctAnswer": "A",
                            "explanation": f"rec({n}) in C evaluates {n} + ... + 1 = {sum(range(1, n + 1))}.",
                            "topic": "recursion",
                            "difficulty": "medium",
                        }
                    elif norm_lang == "java":
                        return {
                            "question": f"What is the output of the Java recursive method:\npublic static int rec(int n) {{\n    if (n <= 1) return 1;\n    return n + rec(n - 1);\n}}\n// System.out.println(rec({n}));",
                            "options": [
                                f"A) {sum(range(1, n + 1))}",
                                f"B) {sum(range(1, n))}",
                                f"C) {n * 2}",
                                f"D) {n}",
                            ],
                            "correctAnswer": "A",
                            "explanation": f"rec({n}) in Java returns {sum(range(1, n + 1))}.",
                            "topic": "recursion",
                            "difficulty": "medium",
                        }
                    else:
                        return {
                            "question": f"What is the output of the recursive function:\ndef sum_rec(n):\n    if n <= 1:\n        return 1\n    return n + sum_rec(n - 1)\nprint(sum_rec({n}))",
                            "options": [
                                f"A) {sum(range(1, n + 1))}",
                                f"B) {sum(range(1, n))}",
                                f"C) {n * 2}",
                                f"D) {n}",
                            ],
                            "correctAnswer": "A",
                            "explanation": f"sum_rec({n}) recursively adds {n} + ... + 1 = {sum(range(1, n + 1))}.",
                            "topic": "recursion",
                            "difficulty": "medium",
                        }

                elif norm_topic == "searching":
                    size = 2 ** (index + 3)
                    max_cmp = index + 4
                    return {
                        "question": f"In a binary search over a sorted array of {size} elements, what is the maximum number of comparisons required to locate an element?",
                        "options": [
                            f"A) {max_cmp}",
                            f"B) {size}",
                            f"C) {size // 2}",
                            f"D) 2",
                        ],
                        "correctAnswer": "A",
                        "explanation": f"Binary search requires at most log2({size}) + 1 = {max_cmp} comparisons.",
                        "topic": "searching",
                        "difficulty": "medium",
                    }

                else:  # basics / logic / syntax
                    if norm_lang == "cpp":
                        return {
                            "question": f"In C++, what does the expression `{index + 10} / 3` evaluate to using integer division?",
                            "options": [
                                f"A) {(index + 10) // 3}",
                                f"B) {(index + 10) / 3:.2f}",
                                f"C) {(index + 10) % 3}",
                                f"D) {index + 10}",
                            ],
                            "correctAnswer": "A",
                            "explanation": f"Integer division truncates towards zero in C++: {(index + 10) // 3}.",
                            "topic": "basics",
                            "difficulty": "easy",
                        }
                    elif norm_lang == "c":
                        return {
                            "question": f"In C, what is the result of `{index + 10} % 4`?",
                            "options": [
                                f"A) {(index + 10) % 4}",
                                f"B) {(index + 10) // 4}",
                                f"C) 0",
                                f"D) 4",
                            ],
                            "correctAnswer": "A",
                            "explanation": f"The % operator returns the remainder in C: {(index + 10) % 4}.",
                            "topic": "basics",
                            "difficulty": "easy",
                        }
                    elif norm_lang == "java":
                        return {
                            "question": f"In Java, what is the result of integer division `{index + 12} / 5`?",
                            "options": [
                                f"A) {(index + 12) // 5}",
                                f"B) {(index + 12) / 5:.1f}",
                                f"C) {(index + 12) % 5}",
                                f"D) {index + 12}",
                            ],
                            "correctAnswer": "A",
                            "explanation": f"Integer division in Java truncates fractional parts: {(index + 12) // 5}.",
                            "topic": "basics",
                            "difficulty": "easy",
                        }
                    else:
                        n1 = (index + 2) * 4
                        n2 = (index + 1) * 3
                        return {
                            "question": f"What is the output of integer floor division {n1} // {n2} in Python?",
                            "options": [
                                f"A) {n1 // n2}",
                                f"B) {n1 / n2:.2f}",
                                f"C) {n1 % n2}",
                                f"D) {n1 + n2}",
                            ],
                            "correctAnswer": "A",
                            "explanation": f"The // operator computes floor division: {n1} // {n2} = {n1 // n2}.",
                            "topic": "basics",
                            "difficulty": "easy",
                        }

            # Select candidate pool strictly from requested (topics, target_lang)
            candidate_pool = []
            for t in target_topics:
                norm_t = t.lower().strip()
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
            primary_topic = target_topics[0] if target_topics else "basics"
            while len(chosen_questions) < count:
                dynamic_q = generate_topic_dynamic_question(primary_topic, target_lang, fallback_index)
                norm = normalize_text(dynamic_q["question"])
                if norm not in excluded_set and norm not in seen_in_current_quiz:
                    seen_in_current_quiz.add(norm)
                    chosen_questions.append(dynamic_q)
                fallback_index += 1

            return {"questions": chosen_questions[:count]}

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
            return {
                "summary": "Overall class progress is solid in iterative algorithms, but recursion remains a major bottleneck for 35% of the class.",
                "strongTopics": ["loops", "arrays"],
                "weakTopics": ["recursion"],
                "studentsNeedingAttention": [
                    {
                        "name": "Alex Smith",
                        "reason": "Consistently failing recursion test cases and scoring under 50% on daily quizzes.",
                    }
                ],
                "recommendations": [
                    "Dedicate the next lab session to visual call-stack debugging for recursion.",
                    "Assign pair-programming exercises breaking down divide-and-conquer logic.",
                ],
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

            # Starter code templates by language
            starter_templates = {
                "c": "#include <stdio.h>\n\nint main() {\n    // Read input and implement solution in C\n    \n    return 0;\n}\n",
                "cpp": "#include <iostream>\n#include <vector>\nusing namespace std;\n\nint main() {\n    // Read input and implement solution in C++\n    \n    return 0;\n}\n",
                "java": "import java.util.Scanner;\n\npublic class Solution {\n    public static void main(String[] args) {\n        Scanner sc = new Scanner(System.in);\n        // Read input and implement solution in Java\n        \n    }\n}\n",
                "python": "import sys\n\ndef solve():\n    # Read input from sys.stdin and implement solution in Python\n    pass\n\nif __name__ == '__main__':\n    solve()\n",
            }

            # Problem Catalog by (topic, difficulty)
            problems_by_topic = {
                "loops": {
                    "EASY": {
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
                    "MEDIUM": {
                        "title": "Nested Number Triangle Pattern",
                        "description": f"Generate a right-angled numerical pattern using nested loops in {lang.upper()}.",
                        "problemStatement": f"Given an integer N, generate a right-aligned number pyramid of height N where row i contains numbers 1 through i separated by a space.",
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
                    "HARD": {
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
                    }
                },
                "arrays": {
                    "EASY": {
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
                    "MEDIUM": {
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
                    "HARD": {
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
                    }
                },
                "recursion": {
                    "EASY": {
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
                    "MEDIUM": {
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
                    "HARD": {
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
                },
                "searching": {
                    "EASY": {
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
                    },
                    "MEDIUM": {
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
                    "HARD": {
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
                }
            }

            selected_topic_catalog = problems_by_topic.get(topic) or problems_by_topic["loops"]
            base_problem = selected_topic_catalog.get(difficulty) or selected_topic_catalog.get("MEDIUM") or selected_topic_catalog["EASY"]

            res = {
                "title": base_problem["title"],
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
                    prob = selected_topic_catalog.get(d) or base_problem
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
