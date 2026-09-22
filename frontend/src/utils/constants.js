export const ROLES = {
  STUDENT: 'STUDENT',
  TEACHER: 'TEACHER',
  ADMIN: 'ADMIN',
};

export const ROLE_LABELS = {
  STUDENT: 'Student',
  TEACHER: 'Instructor',
  ADMIN: 'System Admin',
};

export const PROGRAMMING_LANGUAGES = [
  { label: 'JavaScript (Node.js)', value: 'javascript', monaco: 'javascript', ext: '.js' },
  { label: 'Python 3', value: 'python', monaco: 'python', ext: '.py' },
  { label: 'C++ (GCC)', value: 'cpp', monaco: 'cpp', ext: '.cpp' },
  { label: 'Java (OpenJDK)', value: 'java', monaco: 'java', ext: '.java' },
];

export const CODE_STARTERS = {
  javascript: `/**
 * Write your JavaScript solution below.
 * Read input from standard input or process parameters as required.
 */
function solve() {
  // Your code here
}

solve();
`,
  python: `# Write your Python 3 solution below.
import sys

def solve():
    # Read from sys.stdin or implement logic
    pass

if __name__ == '__main__':
    solve()
`,
  cpp: `// Write your C++ solution below.
#include <iostream>
#include <vector>
#include <string>

using namespace std;

int main() {
    ios_base::sync_with_stdio(false);
    cin.tie(NULL);
    
    // Your code here
    return 0;
}
`,
  java: `// Write your Java solution below.
import java.util.*;
import java.io.*;

public class Solution {
    public static void main(String[] args) {
        Scanner scanner = new Scanner(System.in);
        // Your code here
    }
}
`,
};

export const DIFFICULTY_CONFIG = {
  EASY: { label: 'Easy', color: 'green', bg: '#ecfdf5', text: '#059669' },
  MEDIUM: { label: 'Medium', color: 'orange', bg: '#fffbeb', text: '#d97706' },
  HARD: { label: 'Hard', color: 'red', bg: '#fef2f2', text: '#dc2626' },
};

export const SUBMISSION_STATUS_CONFIG = {
  PENDING: { label: 'Pending', color: 'default' },
  PROCESSING: { label: 'Processing', color: 'processing' },
  PASSED: { label: 'Passed', color: 'success' },
  FAILED: { label: 'Failed', color: 'error' },
  ERROR: { label: 'Error', color: 'warning' },
};

export const TOPIC_TAXONOMY = [
  'Basics',
  'Variables',
  'Control Flow',
  'Conditionals',
  'Loops',
  'Functions',
  'Recursion',
  'Arrays',
  'Strings',
  'Pointers',
  'Object-Oriented Programming',
  'Inheritance',
  'Polymorphism',
  'Data Structures',
  'Linked Lists',
  'Stacks',
  'Queues',
  'Trees',
  'Binary Trees',
  'Graphs',
  'Dynamic Programming',
  'Sorting',
  'Searching',
  'Complexity Analysis',
];

export const MASTERY_THRESHOLDS = {
  EXCELLENT: 85,
  GOOD: 70,
  NEEDS_IMPROVEMENT: 50,
  WEAK: 49,
};
