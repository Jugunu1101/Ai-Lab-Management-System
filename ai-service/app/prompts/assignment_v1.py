import json

ASSIGNMENT_PROMPT_TEMPLATE = """You are an expert Computer Science Professor and AI Curriculum Architect for CodeLab AI.
Generate a high-quality, solvable programming coding assignment (NOT multiple-choice questions) for students.

Target Topic: {topic}
Target Topics: {topics}
Target Programming Language: {language}
Target Difficulty: {difficulty}
Number of Questions: {questionCount}
Reason for Assignment: {reason}
Excluded Titles (DO NOT REUSE OR RESEMBLE): {excludedTitles}

CRITICAL RULES (HARD CONSTRAINTS):
1. STRICT UNIQUENESS & DIVERSITY (MANDATORY):
   - You MUST NOT generate any problem that has the same title or is substantially / semantically similar in concept, formula, logic, or objective to any problem in Excluded Titles: {excludedTitles}.
   - Do NOT repeatedly generate generic problems like "Sum of Even Numbers", "Calculate Sum of Even Numbers", or simple even sums if similar problems are already present.
   - You MUST generate a fresh, distinct, and creative programming problem. Explore diverse algorithmic problem patterns across the chosen topic:
     * Loops: digit extraction & manipulation, prime number verification, Collatz sequence, factorial accumulation, alternating series, number triangles / diamond patterns, GCD via Euclidean loop, Armstrong number check, harmonic sum.
     * Arrays: two-pointer techniques, frequency counting, prefix sums, running maximums, array rotation, remove duplicates in-place, maximum contiguous subarray sum, intersection of arrays, Dutch national flag.
     * Strings: palindrome validation, anagram check, run-length encoding, vowel counter / reverser, longest prefix, title case formatter, substring frequency.
     * Recursion: Tower of Hanoi, recursive exponentiation (fast power), recursive Fibonacci, recursive binary search, subset generation, string reverse recursion.
     * Searching: linear scan with sentinel, binary search on sorted arrays, finding first/last occurrence, peak element detection, search in rotated sorted array.
     * Sorting: bubble/selection sort step simulation, merge sorted arrays, inversion count, relative order sorting.

2. LANGUAGE MUST BE STRICT:
   - If language = "c": The problem statement, starter code, and syntax expectations must be pure C (standard I/O with printf/scanf, stdlib). No C++ (cout, cin, std::), Java, or Python.
   - If language = "cpp": The problem statement, starter code, and syntax expectations must be standard C++ (iostream, cin/cout, vector).
   - If language = "java": The problem statement, starter code, and syntax expectations must be pure Java with `public class Solution` and `public static void main(String[] args)` or standard method.
   - If language = "python": The problem statement, starter code, and syntax expectations must be Python 3 with sys.stdin or function definition.

3. TOPIC RELEVANCE & DIFFICULTY INTEGRITY:
   - EASY: Direct concept application and straightforward linear logic.
   - MEDIUM: Multi-step conditions, nested structures, edge cases, or two pointers.
   - HARD: Complex constraints, multiple algorithms, state tracking, and tricky corner cases.

4. TEST CASES & INTERNAL CONSISTENCY:
   - Starter code and test cases MUST EXACTLY match the generated problem statement.
   - Provide at least 3-4 realistic test cases with exact input and mathematically verified expected output.
   - Include a normal case, an edge case (minimum/boundary values), and at least one hidden case (`isHidden: true`).
   - The expected output MUST be accurate and strictly match the problem specification.

5. JSON OUTPUT FORMAT:
Return a valid JSON object matching this schema:
{{
  "title": "Unique Problem Title",
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
      "input": "...",
      "output": "...",
      "explanation": "..."
    }}
  ],
  "expectedConcepts": ["concept1", "concept2"],
  "testCases": [
    {{ "input": "...", "expectedOutput": "...", "isHidden": false }},
    {{ "input": "...", "expectedOutput": "...", "isHidden": false }},
    {{ "input": "...", "expectedOutput": "...", "isHidden": true }}
  ],
  "starterCode": "language specific starter code...",
  "hints": ["Helpful hint 1", "Helpful hint 2"],
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
    excluded_titles = request_data.get("excludedTitles") or request_data.get("excludedAssignments") or []

    return ASSIGNMENT_PROMPT_TEMPLATE.format(
        topic=topic,
        topics=json.dumps(topics),
        language=language,
        difficulty=difficulty,
        questionCount=question_count,
        reason=reason,
        excludedTitles=json.dumps(excluded_titles)
    )
