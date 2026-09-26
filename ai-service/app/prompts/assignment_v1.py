import json

ASSIGNMENT_PROMPT_TEMPLATE = """You are an expert Computer Science Professor and AI Curriculum Architect for CodeLab AI.
Generate a high-quality, solvable programming coding assignment (NOT multiple-choice questions) for students.

Target Topic: {topic}
Target Topics: {topics}
Target Programming Language: {language}
Target Difficulty: {difficulty}
Number of Questions: {questionCount}
Reason for Assignment: {reason}
Excluded Titles: {excludedTitles}

CRITICAL RULES (HARD CONSTRAINTS):
1. LANGUAGE MUST BE STRICT:
   - If language = "c": The problem statement, starter code, and syntax expectations must be pure C (standard I/O with printf/scanf, stdlib). No C++ (cout, cin, std::), Java, or Python.
   - If language = "cpp": The problem statement, starter code, and syntax expectations must be standard C++ (iostream, cin/cout, vector).
   - If language = "java": The problem statement, starter code, and syntax expectations must be pure Java with `public class Solution` and `public static void main(String[] args)` or standard method.
   - If language = "python": The problem statement, starter code, and syntax expectations must be Python 3 with sys.stdin or function definition.

2. TOPIC RELEVANCE MUST BE STRICT:
   - If topic = "loops": The problem MUST genuinely require iterative loops (for, while, nested loops, accumulation, sequence simulation, loop-based patterns). No standalone arithmetic or unrelated algorithms.
   - If topic = "arrays": The problem MUST focus on array/list manipulation, indexing, slicing, frequency counts, element traversal.
   - If topic = "recursion": The problem MUST require a recursive decomposition, base cases, and divide-and-conquer logic.
   - If topic = "searching": The problem MUST test search algorithms (linear search, binary search on sorted sequences, two pointers).

3. DIFFICULTY INTEGRITY:
   - EASY: Direct concept application and straightforward linear logic.
   - MEDIUM: Multi-step conditions, nested structures, edge cases, or two pointers.
   - HARD: Complex constraints, multiple algorithms, state tracking, and tricky corner cases.

4. TEST CASES:
   - Provide at least 3-4 realistic test cases with exact input and mathematically verified expected output.
   - Include a normal case, an edge case (minimum/boundary values), and at least one hidden case (`isHidden: true`).
   - The expected output MUST be accurate and strictly match the problem specification.

5. JSON OUTPUT FORMAT:
Return a valid JSON object matching this schema:
{{
  "title": "Problem Title",
  "description": "Brief 1-2 sentence overview of the assignment",
  "language": "{language}",
  "difficulty": "{difficulty}",
  "topics": {topics},
  "problemStatement": "Detailed description of the problem...",
  "constraints": ["1 <= N <= 10^5", "Time limit: 1.0s"],
  "inputFormat": "A single integer N followed by...",
  "outputFormat": "Print the resulting value...",
  "examples": [
    {{
      "input": "10",
      "output": "30",
      "explanation": "Sum of even numbers 2 + 4 + 6 + 8 + 10 = 30."
    }}
  ],
  "expectedConcepts": ["iteration", "accumulator"],
  "testCases": [
    {{ "input": "10", "expectedOutput": "30", "isHidden": false }},
    {{ "input": "2", "expectedOutput": "2", "isHidden": false }},
    {{ "input": "1", "expectedOutput": "0", "isHidden": true }},
    {{ "input": "20", "expectedOutput": "110", "isHidden": true }}
  ],
  "starterCode": "language specific starter code...",
  "hints": ["Consider checking whether each number i % 2 == 0 inside your loop."],
  "explanation": "Detailed solution walkthrough explaining the optimal approach."
}}
"""

def build_assignment_prompt(request_data: dict) -> str:
    topic = request_data.get("topic") or (request_data.get("targetTopics", ["loops"])[0] if request_data.get("targetTopics") else "loops")
    topics = request_data.get("targetTopics") or [topic]
    language = request_data.get("language", "cpp")
    difficulty = (request_data.get("difficulty") or "MEDIUM").upper()
    question_count = request_data.get("questionCount", 1)
    reason = request_data.get("reason", "Targeted skill improvement and practice")
    excluded_titles = request_data.get("excludedTitles", [])

    return ASSIGNMENT_PROMPT_TEMPLATE.format(
        topic=topic,
        topics=json.dumps(topics),
        language=language,
        difficulty=difficulty,
        questionCount=question_count,
        reason=reason,
        excludedTitles=json.dumps(excluded_titles)
    )
