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
You are an expert computer science professor and AI programming quiz generator.
{exclusion_text}
Generate a multiple-choice quiz.
Generate a challenging, high-quality programming skill assessment.

CRITICAL ASSESSMENT QUALITY & QUESTION DIVERSITY RULES (MANDATORY):
1. REAL PROGRAMMING ASSESSMENT: Every question must test real programming skill: understanding, tracing, debugging, and reasoning about code.
   - STRICTLY FORBIDDEN: Simple arithmetic equations without variables (e.g. "what does 201 / 3 evaluate to"), trivial vocabulary definitions, or questions answerable without programming knowledge.
   - At least 60% of all questions MUST contain a concrete code snippet in {request.language} with formatting using newlines.

2. TARGET QUESTION TYPE DISTRIBUTION (for {request.questionCount} questions on topic: {json.dumps(request.topics)}):
   - Code Output / Code Tracing (approx 40%): Provide a code snippet specifically using concepts from {json.dumps(request.topics)} and ask for exact output or final state.
   - Debugging / Error Identification (approx 20%): Present code containing a bug or syntax issue within {json.dumps(request.topics)} and ask what occurs or how to fix it.
   - Core Concepts & Language Semantics (approx 20%): Declaration, initialization, scope, mutability, type conversion, or specific mechanics of {json.dumps(request.topics)}.
   - Practical Logic & Output Reasoning (approx 20%): Realistic problem-solving scenario centered on {json.dumps(request.topics)}.

3. STRICT TOPIC ENFORCEMENT (ABSOLUTE MANDATE):
   - The requested topics are: {json.dumps(request.topics)}.
   - Every single generated question MUST directly, strictly, and genuinely test the requested topics: {json.dumps(request.topics)}.
   - If topic = "variables": Every question MUST directly test variable declaration, initialization, assignment, variable modification/tracing, data types, constants (const/final), scope, type conversion/casting, variable naming rules, or primitive storage in {request.language}. DO NOT generate questions about array traversal, sorting algorithms, loop structures, time complexity of data structures, or recursion.
   - If topic = "conditionals": Every question MUST test conditional statements (if, if-else, else-if/elif, switch, ternary operator ? :, condition evaluation) in {request.language}. DO NOT generate loop-only or recursion questions.
   - If topic = "loops": Every question MUST directly test loop constructs (for loops, while loops, do-while loops, range/iterator, break, continue, loop iterations, loop counters, loop conditions, or loop output tracing). Do NOT generate standalone arithmetic, simple variable definitions, or unrelated output questions.
   - If topic = "arrays": Every question MUST test array/list indexing, 1D/2D arrays, element mutation, vector/list operations, array iteration, or array bounds in {request.language}. DO NOT generate questions about scalar variables or non-array topics.
   - If topic = "recursion": Every question MUST test recursive functions, base cases, call stacks, or recursive logic tracing in {request.language}. DO NOT generate non-recursive loop/array questions.
   - If topic = "searching": Every question MUST test search algorithms (linear search, binary search, search complexity, search steps).
   - If topic = "logic": Every question MUST test boolean logic, truth values, AND/OR/NOT operators, conditional evaluation, or boolean comparison expressions.
   - If topic = "syntax": Every question MUST test syntax rules, keywords, semicolons, brackets, function definitions, parameters, or language-specific compiler syntax errors in {request.language}.
   - If topic = "basics": Every question MUST test fundamental language features: variables, basic I/O, operators, primitive data types, and basic expressions in {request.language}.

4. STRICT PROGRAMMING LANGUAGE ENFORCEMENT: The requested programming language is: {request.language}.
   - Every code snippet, question text, keyword, and option MUST strictly belong to {request.language}.
   - Do NOT mix programming languages under any circumstances.
   - If language = "cpp" / "C++": Use C++ syntax (`std::cout`, `std::cin`, `std::vector`, `int main()`, `#include <iostream>`).
   - If language = "c" / "C": Use standard C syntax (`printf`, `scanf`, arrays, pointers, `#include <stdio.h>`).
   - If language = "java" / "Java": Use standard Java syntax (`System.out.println`, `int[]`, `ArrayList`, standard methods).
   - If language = "python" / "Python": Use Python syntax (`def`, `for i in range(...)`, `print()`, slicing).

5. BALANCED ANSWER POSITION DISTRIBUTION (CRITICAL):
   - You MUST distribute the correct answers evenly across options A, B, C, and D across the generated quiz.
   - Do NOT bias towards option A or option B. Aim for approximately 25% A, 25% B, 25% C, and 25% D across the questions.

RULES:
1. Generate exactly {request.questionCount} unique, high-quality programming questions testing ONLY the requested topics ({json.dumps(request.topics)}) in the requested programming language ({request.language}).
2. Programming language: {request.language}
3. Difficulty: {request.difficulty}
4. Each question must have exactly 4 options prefixed with "A) ", "B) ", "C) ", "D) ".
5. correctAnswer must be the single uppercase letter of the correct option: "A", "B", "C", or "D".
6. Include the topic name and difficulty for each question.
7. Include a concise, illuminating explanation explaining WHY the correct option is right and others are wrong.
8. Return ONLY valid JSON, no markdown code fences, no extra text.

Return this exact structure:
{{
  "questions": [
    {{
      "question": "What is the output of the following C++ code snippet?\\nint x = 10;\\nx = x + 5;\\nstd::cout << x;",
      "options": [
        "A) 10",
        "B) 15",
        "C) 5",
        "D) Compiler error"
      ],
      "correctAnswer": "B",
      "explanation": "x is initialized to 10. The assignment x = x + 5 updates x to 15.",
      "topic": "{request.topics[0] if request.topics else 'variables'}",
      "difficulty": "{request.difficulty}"
    }}
  ]
}}
"""