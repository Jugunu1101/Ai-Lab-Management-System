import json
import random

from app.schemas.quiz import QuizRequest


PROMPT_VERSION = "quiz_v1"


def build_quiz_prompt(
    request: QuizRequest
) -> str:
    seed = random.randint(1, 100000)
    exclusion_text = ""
    if request.excludedQuestions and len(request.excludedQuestions) > 0:
        exclusion_text = f"""
PREVIOUSLY ASKED QUESTIONS (DO NOT DUPLICATE OR MERELY REPHRASE):
{json.dumps(request.excludedQuestions, indent=2)}

CRITICAL UNIQUENESS INSTRUCTION:
Generate brand new questions that do not duplicate or merely rephrase any of the previously asked questions listed above. Test different subtopics, operations, syntax patterns, edge cases, output predictions, and scenarios.
"""

    return f"""
You are an AI programming quiz generator. Use this internal random seed for variation: {seed}.
{exclusion_text}
Generate a multiple-choice quiz.

CRITICAL TOPIC AND LANGUAGE RELEVANCE RULES (HARD CONSTRAINTS):
1. STRICT TOPIC ENFORCEMENT: The requested topics are: {json.dumps(request.topics)}.
   - Every single generated question MUST directly, strictly, and genuinely test the requested topics: {json.dumps(request.topics)}.
   - If topic = "loops": Every question MUST directly test loop constructs (for loops, while loops, nested loops, range/iterator, break, continue, loop iterations, loop counters, loop conditions, or loop output tracing). Do NOT generate standalone arithmetic, simple variable definitions, or unrelated output questions. Questions like "What is the output of 262 + 113 * 2" are STRICTLY FORBIDDEN.
   - If topic = "arrays": Every question MUST test array/list indexing, slicing, appending, mutating, iteration over arrays/lists, or array properties in {request.language}.
   - If topic = "recursion": Every question MUST test recursive functions, base cases, call stacks, or recursive logic tracing in {request.language}.
   - If topic = "searching": Every question MUST test search algorithms (linear search, binary search, search complexity, search steps).
   - If topic = "logic": Every question MUST test boolean logic, truthiness, conditional statements, or comparison operators.
   - If topic = "syntax": Every question MUST test syntax, keywords, function definitions, parameters, or control flow specific to {request.language}.
   - If topic = "basics": Every question MUST test fundamental data types, type conversions, or basic operators in {request.language}.
   - DO NOT generate generic programming questions or arithmetic expressions that do not assess the requested topic.

2. STRICT PROGRAMMING LANGUAGE ENFORCEMENT: The requested programming language is: {request.language}.
   - Every code snippet, question text, keyword, and option MUST strictly belong to {request.language}.
   - Do NOT mix programming languages under any circumstances.
   - If language = "cpp" / "C++": Use C++ syntax (e.g. `std::cout`, `std::cin`, `std::vector`, `for (int i = 0; i < n; i++)`, `while(...)`, `break;`, `#include <iostream>`). Do NOT include Python `range()`, `def`, `elif`, or Java `System.out.println`.
   - If language = "c" / "C": Use standard C syntax (e.g. `printf`, `scanf`, arrays, pointers, `for (int i = 0; i < n; i++)`, `while(...)`, `break;`, `#include <stdio.h>`). Do NOT include C++ `std::cout`, Python syntax, or Java classes.
   - If language = "java" / "Java": Use Java syntax (e.g. `System.out.println`, `for (int i = 0; i < n; i++)`, `while(...)`, `ArrayList`, `int[] arr`). Do NOT include Python `range()` or C++ `std::cout`.
   - If language = "python" / "Python": Use Python syntax (e.g. `for i in range(...)`, `print()`, `def`, `while`, `len()`). Do NOT include C/C++/Java type declarations like `int i = 0;` or semicolons.

RULES:

1. Generate exactly {request.questionCount} unique, highly specific questions testing ONLY the requested topics ({json.dumps(request.topics)}) in the requested programming language ({request.language}).
2. Ensure every question within this quiz is completely unique.
3. Use only these topics:
   {json.dumps(request.topics)}
4. Programming language: {request.language}
5. Difficulty: {request.difficulty}
6. Each question must have exactly 4 options prefixed with "A) ", "B) ", "C) ", "D) ".
7. correctAnswer must be the letter of the correct option: "A", "B", "C", or "D".
8. Include the topic name and difficulty for each question.
9. Include a short explanation.
10. Return ONLY valid JSON.
11. Do not use markdown.

Return this exact structure:

{{
  "questions": [
    {{
      "question": "Question text",
      "options": [
        "A) Option 1",
        "B) Option 2",
        "C) Option 3",
        "D) Option 4"
      ],
      "correctAnswer": "A",
      "explanation": "Short explanation",
      "topic": "topic name",
      "difficulty": "{request.difficulty}"
    }}
  ]
}}
"""