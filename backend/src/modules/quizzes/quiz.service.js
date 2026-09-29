const mongoose = require("mongoose");
const Quiz = require("./quiz.model");
const QuizAttempt = require("./quizAttempt.model");
const Progress = require("../progress/progress.model");
const { updateProgressFromQuiz } = require("../progress/progress.service");
const { generateQuiz } = require("../../services/ai/ai.service");
const AIAnalysis = require("../../services/ai/aiAnalysis.model");
const { invalidateStudentDashboardCache } = require("../student/student.service");

const createQuiz = async ({ title, language, topic, questions, teacherId }) => {
  const quiz = await Quiz.create({
    title,
    language,
    topic,
    topics: [topic],
    questions,
    createdBy: teacherId,
  });

  return quiz;
};

const shuffleQuestionOptions = (question) => {
  if (!question || !Array.isArray(question.options) || question.options.length !== 4) {
    return question;
  }

  const rawAns = String(question.correctAnswer || "A").trim();
  const letters = ["A", "B", "C", "D"];

  let correctIdx = 0;
  if (/^[0-3]$/.test(rawAns)) {
    correctIdx = parseInt(rawAns, 10);
  } else if (/^[A-Da-d]/.test(rawAns)) {
    correctIdx = letters.indexOf(rawAns.charAt(0).toUpperCase());
  } else {
    const cleanRaw = rawAns.replace(/^[A-Da-d][\s.):\-\]]+\s*/, "").trim().toLowerCase();
    const foundIdx = question.options.findIndex((opt) => {
      const cleanOpt = String(opt).replace(/^[A-Da-d][\s.):\-\]]+\s*/, "").trim().toLowerCase();
      return cleanOpt === cleanRaw || String(opt).trim().toLowerCase() === rawAns.toLowerCase();
    });
    if (foundIdx !== -1) correctIdx = foundIdx;
  }

  if (correctIdx < 0 || correctIdx >= 4) correctIdx = 0;

  const items = question.options.map((opt, idx) => ({
    text: String(opt).replace(/^[A-Da-d][\s.):\-\]]+\s*/, "").trim(),
    isCorrect: idx === correctIdx,
  }));

  for (let i = items.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [items[i], items[j]] = [items[j], items[i]];
  }

  let newCorrectLetter = "A";
  const newOptions = items.map((item, idx) => {
    if (item.isCorrect) {
      newCorrectLetter = letters[idx];
    }
    return `${letters[idx]}) ${item.text}`;
  });

  return {
    ...question,
    options: newOptions,
    correctAnswer: newCorrectLetter,
  };
};

const createAIQuiz = async ({ studentId, language, topics, questionCount = 10 }) => {
  const aiResult = await generateQuiz({
    student: {
      id: studentId.toString(),
    },
    topics,
    language,
    questionCount,
  });

  if (
    !aiResult ||
    !Array.isArray(aiResult.questions) ||
    aiResult.questions.length === 0
  ) {
    const error = new Error("AI service returned no quiz questions");
    error.statusCode = 502;
    error.code = "AI_INVALID_RESPONSE";
    throw error;
  }

  const questions = aiResult.questions.map((question) =>
    shuffleQuestionOptions({
      question: question.question,
      options: question.options,
      correctAnswer: question.correctAnswer,
      explanation: question.explanation || "",
      topic: question.topic || topics[0],
      difficulty: question.difficulty || "medium",
    })
  );

  return await Quiz.create({
    title: `AI Quiz - ${topics.join(", ")}`,
    language,
    topic: topics[0],
    topics,
    questions,
    studentId,
    createdBy: studentId,
  });
};

const normalizeLanguage = (lang) => {
  if (!lang || typeof lang !== "string") return "cpp";
  const clean = lang.toLowerCase().trim();
  if (clean === "c++" || clean === "cpp") return "cpp";
  if (clean === "c") return "c";
  if (clean === "java") return "java";
  if (clean === "python" || clean === "py") return "python";
  return "cpp";
};

const LANGUAGE_VALIDATORS = {
  python: (text) => {
    // Reject explicit C/C++/Java syntax indicators or language markers
    const cCppJavaDisallowed = /\b(std::|cout\b|cin\b|#include\b|printf\s*\(|scanf\s*\(|malloc\s*\(|public\s+class\b|System\.out|public\s+static\b|String\[\]|int\s+[a-zA-Z_]\w*\s*=|for\s*\(\s*int\s+|in\s+c\b|in\s+c\+\+|in\s+java\b)\b/i;
    if (cCppJavaDisallowed.test(text)) {
      return false;
    }
    return true;
  },
  cpp: (text) => {
    // Reject Python-only and Java-only indicators or language markers
    const pythonDisallowed = /\b(range\s*\(|def\s+[a-zA-Z_]|elif\b|None\b|isinstance\s*\(|enumerate\s*\(|len\s*\(|in\s+python\b|in\s+java\b)\b/i;
    const javaDisallowed = /\b(System\.out|public\s+class\b|public\s+static\b|String\[\]|ArrayList<)\b/i;
    if (pythonDisallowed.test(text) || javaDisallowed.test(text)) {
      return false;
    }
    return true;
  },
  c: (text) => {
    // Reject C++ only (std::, cout, cin, new, delete, template, class), Python-only, Java-only
    const cppDisallowed = /\b(std::|cout\b|cin\b|template\s*<|namespace\b|nullptr\b|vector<|public\s+class\b|System\.out|public\s+static\b|String\[\]|ArrayList<|in\s+python\b|in\s+java\b|in\s+c\+\+)\b/i;
    const pythonDisallowed = /\b(range\s*\(|def\s+[a-zA-Z_]|elif\b|None\b|isinstance\s*\(|enumerate\s*\(|len\s*\(|in\s+python\b)\b/i;
    const javaDisallowed = /\b(System\.out|public\s+class\b|public\s+static\b|String\[\]|ArrayList<)\b/i;
    if (cppDisallowed.test(text) || pythonDisallowed.test(text) || javaDisallowed.test(text)) {
      return false;
    }
    return true;
  },
  java: (text) => {
    // Reject C/C++ only (#include, std::, cout, cin, printf, malloc, pointers) and Python-only
    const cppDisallowed = /\b(std::|cout\b|cin\b|#include\b|malloc\s*\(|free\s*\(|nullptr\b|in\s+python\b|in\s+c\b|in\s+c\+\+)\b/i;
    const pythonDisallowed = /\b(range\s*\(|def\s+[a-zA-Z_]|elif\b|None\b|isinstance\s*\(|enumerate\s*\(|len\s*\(|in\s+python\b)\b/i;
    if (cppDisallowed.test(text) || pythonDisallowed.test(text)) {
      return false;
    }
    return true;
  },
};

const validateQuestionLanguage = (question, requestedLanguage) => {
  if (!question || typeof question !== "object") return false;
  if (!question.question || typeof question.question !== "string") return false;
  if (!Array.isArray(question.options) || question.options.length < 2) return false;

  if (!requestedLanguage) return true;
  const langKey = normalizeLanguage(requestedLanguage);

  const optionsText = Array.isArray(question.options) ? question.options.join(" ") : "";
  const combinedText = `${question.question} ${optionsText} ${question.explanation || ""}`;

  const validator = LANGUAGE_VALIDATORS[langKey];
  if (validator) {
    return validator(combinedText);
  }
  return true;
};

const TOPIC_VALIDATORS = {
  variables: (text) => {
    // 1. MUST REJECT heavy cross-topic concepts:
    // - Array traversal / sorting / binary search / array time complexity
    // - Standalone recursive call tracing
    const crossTopicRejects = /\b(time\s+complexity\s+of\s+traversing|binary\s+search|linear\s+search|base\s+case|recursive|call\s+stack|bubble\s+sort|quick\s+sort|merge\s+sort)\b/i;
    if (crossTopicRejects.test(text)) {
      return false;
    }
    // 2. MUST contain variable concept indicators:
    const varRegex = /\b(variable|variables|declare|declaring|declaration|initialize|initialized|initialization|assign|assigning|assignment|reassign|reassigned|data\s+type|data\s+types|datatype|datatypes|const\b|constant|constants|final\b|static_cast|typecast|typecasting|type\s+conversion|scope|shadowing|identifier|primitive|int\b|float\b|double\b|char\b|bool\b|boolean\b|string\b|let\b|var\b|val\b|value\s+assigned|value\s+of|value\s+will|contain|store|storing)\b/i;
    return varRegex.test(text);
  },
  conditionals: (text) => {
    const crossTopicRejects = /\b(base\s+case|recursive|call\s+stack)\b/i;
    if (crossTopicRejects.test(text)) return false;
    const condRegex = /\b(if\b|if-else|else\s+if|elif\b|switch\b|case\b|ternary|\?\s*:|conditional|conditions?|branch|branches|else\b)\b/i;
    return condRegex.test(text);
  },
  loops: (text) => {
    const loopRegex = /\b(for\s*\(|for\s+\w+\s+in|while\s*\(|do\s*\{|range\s*\(|break\b|continue\b|iterat|nested\s+loop|loop|loops|looping|enumerate\s*\(|zip\s*\(|counter)\b/i;
    const standaloneArithmeticRegex = /what\s+is\s+the\s+output\s+of\s+(the\s+)?arithmetic\s+expression/i;
    if (standaloneArithmeticRegex.test(text) && !loopRegex.test(text)) {
      return false;
    }
    return loopRegex.test(text);
  },
  arrays: (text) => {
    return /\b(array|arrays|list|lists|index|indexing|slice|slicing|append|pop|push_back|insert|reverse|extend|len\s*\(|element|elements|subscript|vector|vectors|matrix|1d|2d)\b|\[\s*[\d'"]*[\w\s,]*\]/i.test(text);
  },
  recursion: (text) => {
    return /\b(recurs|recursive|recursively|recursion|base\s+case|call\s+stack|recursionerror|depth|calls?\s+itself|factorial|fibonacci)\b|([a-zA-Z_]\w*)\s*\([^)]*\)\s*\{[\s\S]*?\b\2\s*\(/i.test(text) || /\b([a-zA-Z_]\w*)\s*\(.*?\b\1\s*\(/i.test(text);
  },
  searching: (text) => {
    return /\b(search|searching|binary\s+search|linear\s+search|sorted\s+array|target|comparisons?)\b/i.test(text);
  },
  logic: (text) => {
    return /\b(bool|boolean|true|false|and|or|not|conditional|if|else|elif|ternary|comparison|truthy|falsy|!=|==|<=|>=|&&|\|\|)\b/i.test(text);
  },
  syntax: (text) => {
    return /\b(def\b|return|lambda|function|parameter|argument|indent|indentation|try|except|finally|raise|import|scope|global|nonlocal|pass\b|docstring|comment|syntax|colon|keyword|semicolon|braces|compiler\s+error)\b/i.test(text);
  },
  basics: (text) => {
    return /\b(type|data\s+type|float|int|str|integer|string|modulo|division|operator|variable|precedence|len|isinstance|none|cast|casting|immutable|mutable|print\s*\(|std::|printf|System\.out)/i.test(text);
  },
};

const validateQuestionTopic = (question, requestedTopics) => {
  if (!question || typeof question !== "object") return false;
  if (!question.question || typeof question.question !== "string") return false;
  if (!Array.isArray(question.options) || question.options.length < 2) return false;

  if (!requestedTopics) return true;
  const topics = (Array.isArray(requestedTopics) ? requestedTopics : [requestedTopics])
    .filter(Boolean)
    .map((t) => t.toLowerCase().trim());

  if (topics.length === 0) return true;

  const optionsText = Array.isArray(question.options) ? question.options.join(" ") : "";
  const combinedText = `${question.question} ${optionsText} ${question.explanation || ""}`;

  // Check if question content satisfies ANY of the requested topics
  return topics.some((topicKey) => {
    const validator = TOPIC_VALIDATORS[topicKey];
    if (validator) {
      return validator(combinedText);
    }
    // Fallback for custom topic names
    const fallbackRegex = new RegExp(`\\b${topicKey}\\b`, "i");
    return fallbackRegex.test(combinedText);
  });
};

const normalizeQuestionText = (text) => {
  if (!text || typeof text !== "string") return "";
  return text.toLowerCase().replace(/[^a-z0-9]/g, "").trim();
};

const getStudentQuestionHistory = async (studentObjectId) => {
  if (!studentObjectId) return [];

  const [studentQuizzes, studentAttempts] = await Promise.all([
    Quiz.find({
      $or: [{ studentId: studentObjectId }, { createdBy: studentObjectId }],
    }).select("questions.question"),
    QuizAttempt.find({
      studentId: studentObjectId,
    }).select("quizId"),
  ]);

  const attemptedQuizIds = studentAttempts.map((a) => a.quizId).filter(Boolean);
  const attemptedQuizzes = await Quiz.find({
    _id: { $in: attemptedQuizIds },
  }).select("questions.question");

  const allQuestions = [
    ...studentQuizzes.flatMap((q) => (q.questions || []).map((x) => x.question)),
    ...attemptedQuizzes.flatMap((q) => (q.questions || []).map((x) => x.question)),
  ].filter(Boolean);

  return Array.from(new Set(allQuestions));
};

const generateUniqueQuizQuestions = async ({
  studentId,
  topics,
  language,
  questionCount = 10,
  difficulty = "medium",
}) => {
  const targetLang = normalizeLanguage(language);
  const studentObjectId = new mongoose.Types.ObjectId(studentId);
  const previousQuestions = await getStudentQuestionHistory(studentObjectId);

  const seenNormalized = new Set(previousQuestions.map(normalizeQuestionText));
  const collectedQuestions = [];
  const seenInCurrentQuiz = new Set();

  const maxRetries = 6;
  let attempts = 0;

  while (collectedQuestions.length < questionCount && attempts < maxRetries) {
    attempts++;
    const needed = questionCount - collectedQuestions.length;
    const currentExclusions = [
      ...previousQuestions,
      ...collectedQuestions.map((q) => q.question),
    ];

    try {
      const aiResult = await generateQuiz({
        student: { id: studentId.toString() },
        topics,
        language: targetLang,
        questionCount: needed,
        difficulty,
        excludedQuestions: currentExclusions,
      });

      if (aiResult && Array.isArray(aiResult.questions)) {
        for (const item of aiResult.questions) {
          if (!item || !item.question) continue;

          // 1. Topic Relevance Validation (Hard check)
          if (!validateQuestionTopic(item, topics)) {
            console.warn(`[validateQuestionTopic] Question discarded for topics [${topics.join(", ")}]: "${item.question.slice(0, 60)}..."`);
            seenNormalized.add(normalizeQuestionText(item.question));
            continue;
          }

          // 2. Language Relevance Validation (Hard check)
          if (!validateQuestionLanguage(item, targetLang)) {
            console.warn(`[validateQuestionLanguage] Question discarded for language [${targetLang}]: "${item.question.slice(0, 60)}..."`);
            seenNormalized.add(normalizeQuestionText(item.question));
            continue;
          }

          const norm = normalizeQuestionText(item.question);

          // 3. Uniqueness Validation (Student history & current quiz)
          if (!seenNormalized.has(norm) && !seenInCurrentQuiz.has(norm)) {
            seenNormalized.add(norm);
            seenInCurrentQuiz.add(norm);
            collectedQuestions.push(
              shuffleQuestionOptions({
                question: item.question,
                options: item.options,
                correctAnswer: item.correctAnswer,
                explanation: item.explanation || "",
                topic: item.topic || topics[0],
                difficulty: item.difficulty || difficulty,
              })
            );

            if (collectedQuestions.length === questionCount) {
              break;
            }
          }
        }
      }
    } catch (err) {
      console.warn(`Quiz generation attempt ${attempts} failed:`, err.message);
    }
  }

const FALLBACK_TOPIC_BANKS = {
  variables: (langUpper) => [
    {
      q: `What is the value of variable x after: int x = 10; x = x + 5; in ${langUpper}?`,
      opts: ["15", "10", "5", "Compiler error"],
      ans: "A",
      exp: "x is initialized to 10. The assignment x = x + 5 evaluates 10 + 5 = 15."
    },
    {
      q: `Which keyword is used to declare a read-only variable whose value cannot be reassigned in ${langUpper}?`,
      opts: [langUpper === "PYTHON" ? "ALL_CAPS naming convention" : (langUpper === "JAVA" ? "final" : "const"), "static", "var", "volatile"],
      ans: "A",
      exp: `In ${langUpper}, immutable variable declarations use ${langUpper === "PYTHON" ? "naming conventions" : (langUpper === "JAVA" ? "final" : "const")}.`
    },
    {
      q: `What is the key difference between variable declaration and variable initialization?`,
      opts: ["Declaration specifies name and type; initialization assigns an initial value", "Declaration allocates heap memory; initialization compiles code", "Declaration runs at runtime; initialization runs at compile time", "They are identical terms"],
      ans: "A",
      exp: "Declaration introduces an identifier to the compiler; initialization provides its first value."
    },
    {
      q: `In ${langUpper}, what happens when a variable is declared inside a function block?`,
      opts: ["It has local scope and is accessible only within that block", "It becomes a global variable accessible everywhere", "It is stored permanently on disk", "It triggers a runtime exception"],
      ans: "A",
      exp: "Variables defined inside a block have local scope and exist only within that block."
    },
    {
      q: `What is explicit variable type casting in programming?`,
      opts: ["Converting a variable from one data type to another explicitly", "Renaming a variable at runtime", "Deleting a variable from memory", "Exporting a variable to a file"],
      ans: "A",
      exp: "Type casting converts an expression of one type into another desired target type."
    },
    {
      q: `Which data type is appropriate for storing a decimal number with fractional parts in ${langUpper}?`,
      opts: [langUpper === "PYTHON" ? "float" : "double", "int", "char", "bool"],
      ans: "A",
      exp: "Floating-point data types (float/double) represent real numbers with fractional components."
    },
    {
      q: `What is variable scope?`,
      opts: ["The region of code where a variable is visible and accessible", "The memory size of a variable in bytes", "The speed at which a variable is updated", "The total number of variables in a file"],
      ans: "A",
      exp: "Scope determines the lifetime and visibility boundary of a variable name."
    },
    {
      q: `What happens when you assign a new value to an existing mutable variable in ${langUpper}?`,
      opts: ["The variable's stored value is updated to the new value", "A new variable is created with a different name", "The process crashes immediately", "The old value is appended to the new value"],
      ans: "A",
      exp: "Reassigning a variable replaces its previously held value with the new value."
    },
    {
      q: `In ${langUpper}, which of the following is a valid variable identifier naming rule?`,
      opts: ["Identifiers can contain letters, digits, and underscores, but cannot start with a digit", "Identifiers must start with a digit", "Identifiers can contain spaces", "Identifiers cannot contain underscores"],
      ans: "A",
      exp: "Standard programming syntax forbids variable names starting with numeric digits."
    },
    {
      q: `What is uninitialized memory when declaring a primitive variable without assigning a value in languages like C/C++?`,
      opts: ["The variable contains garbage data present in that memory location", "The variable is automatically set to 0", "The variable is set to infinity", "The memory is freed immediately"],
      ans: "A",
      exp: "Uninitialized local variables in C/C++ contain indeterminate garbage memory contents."
    }
  ],
  conditionals: (langUpper) => [
    {
      q: `In ${langUpper}, which statement allows executing code based on boolean condition evaluation?`,
      opts: ["if statement", "for loop", "while loop", "import statement"],
      ans: "A",
      exp: "An if statement executes its block if the condition evaluates to true."
    },
    {
      q: `What is the ternary operator syntax in ${langUpper}?`,
      opts: ["condition ? exprIfTrue : exprIfFalse", "if condition then expr1 else expr2", "condition -> expr1 : expr2", "eval(condition, expr1, expr2)"],
      ans: "A",
      exp: "The ternary operator ? : evaluates a condition and returns one of two expressions."
    },
    {
      q: `What happens in an if-else structure when the condition is false?`,
      opts: ["The else block executes", "The if block executes", "The program crashes", "The code loops infinitely"],
      ans: "A",
      exp: "When an if condition evaluates to false, control shifts to the else branch."
    },
    {
      q: `In a multi-branch if / else-if / else chain, when is an else-if condition evaluated?`,
      opts: ["Only when all preceding conditions in the chain evaluate to false", "Before the first if condition", "Simultaneously with all other branches", "After the else block finishes"],
      ans: "A",
      exp: "Conditionals evaluate sequentially until the first true condition is encountered."
    },
    {
      q: `Which keyword is used for multi-way branching against discrete integer or character values in ${langUpper}?`,
      opts: [langUpper === "PYTHON" ? "match-case / if-elif" : "switch", "while", "for", "goto"],
      ans: "A",
      exp: "Switch or match-case statements branch execution based on matching discrete value cases."
    },
    {
      q: `What is the output of: int score = 85; if (score >= 90) print("A"); else if (score >= 80) print("B"); else print("C"); in ${langUpper}?`,
      opts: ["B", "A", "C", "AB"],
      ans: "A",
      exp: "score 85 fails >= 90 but matches >= 80, outputting B."
    },
    {
      q: `What happens if a switch case in C/C++/Java omits a break statement?`,
      opts: ["Execution falls through to subsequent case statements", "The program throws a syntax error", "The switch statement restarts from case 1", "The computer reboots"],
      ans: "A",
      exp: "Without a break statement, execution falls through sequentially into the next case body."
    },
    {
      q: `What is nested conditional execution?`,
      opts: ["An if or else statement placed inside the body of another conditional statement", "A loop inside an array", "A function returning a boolean", "A comment inside a conditional"],
      ans: "A",
      exp: "Nested conditionals test secondary conditions within an outer branch."
    },
    {
      q: `What boolean value does a comparison expression like (10 > 20) evaluate to?`,
      opts: ["false", "true", "null", "undefined"],
      ans: "A",
      exp: "10 is not greater than 20, so the comparison expression yields false."
    },
    {
      q: `Which logical operator evaluates to true if AT LEAST ONE of its conditions is true in ${langUpper}?`,
      opts: [langUpper === "PYTHON" ? "or" : "||", langUpper === "PYTHON" ? "and" : "&&", "!", "=="],
      ans: "A",
      exp: "Logical OR returns true if any of the operand expressions are true."
    }
  ],
  loops: (langUpper) => [
    {
      q: `In ${langUpper}, which loop construct is guaranteed to execute its body at least once?`,
      opts: ["do-while loop", "for loop", "while loop", "foreach loop"],
      ans: "A",
      exp: "A do-while loop evaluates its conditional expression after executing the body once."
    },
    {
      q: `What will happen if an infinite loop executes in a running process?`,
      opts: ["CPU usage stays at high utilization until timeout or termination", "Process finishes immediately", "Memory leaks immediately to 0", "Compiler throws a syntax error"],
      ans: "A",
      exp: "An infinite loop without termination keeps utilizing CPU cycles continuously."
    },
    {
      q: `What is the primary purpose of a loop termination condition?`,
      opts: ["To prevent infinite iteration and exit loop cleanly", "To optimize memory allocation", "To define variable scope", "To invoke garbage collection"],
      ans: "A",
      exp: "The termination condition checks whether iteration should continue or exit."
    },
    {
      q: `Which keyword is used to skip the current iteration of a loop in ${langUpper}?`,
      opts: ["continue", "break", "return", "skip"],
      ans: "A",
      exp: "The continue statement bypasses remaining statements in the current iteration and advances to the next."
    },
    {
      q: `Which keyword terminates the entire loop immediately in ${langUpper}?`,
      opts: ["break", "stop", "exit", "terminate"],
      ans: "A",
      exp: "The break statement terminates execution of the nearest enclosing loop or switch."
    },
    {
      q: `What is an off-by-one error in loop boundary conditions?`,
      opts: ["Executing a loop one time too many or one time too few due to incorrect comparison operators (< vs <=)", "Dividing loop counter by zero", "Declaring two variables with the same name", "Forgetting to initialize a string"],
      ans: "A",
      exp: "Off-by-one errors stem from boundary mismatches (e.g. using <= size instead of < size)."
    },
    {
      q: `Which control structure is best suited when the exact number of iterations is known beforehand?`,
      opts: ["for loop", "while loop", "do-while loop", "try-catch"],
      ans: "A",
      exp: "A for loop encapsulates initialization, condition, and increment cleanly."
    },
    {
      q: `What is the total number of iterations executed by a nested loop where outer loop runs 3 times and inner loop runs 4 times?`,
      opts: ["12", "7", "3", "4"],
      ans: "A",
      exp: "For each outer loop iteration (3), the inner loop runs 4 times: 3 * 4 = 12 total iterations."
    },
    {
      q: `What happens to the loop counter variable in a standard increment loop like for (int i = 0; i < 5; i++)?`,
      opts: ["i increases by 1 after each iteration body execution", "i decreases by 1 after each iteration", "i remains 0 forever", "i doubles every step"],
      ans: "A",
      exp: "The increment step `i++` adds 1 to counter `i` at the end of every loop iteration."
    },
    {
      q: `In ${langUpper}, what is a while loop condition check?`,
      opts: ["Evaluating the loop condition before executing the loop body on every iteration", "Checking condition once at compile time", "Evaluating condition only after loop finishes", "Ignoring condition"],
      ans: "A",
      exp: "A while loop tests its boolean condition prior to executing the loop body."
    }
  ],
  arrays: (langUpper) => [
    {
      q: `What is the 0-based index of the first element in an array in ${langUpper}?`,
      opts: ["0", "-1", "1", "2"],
      ans: "A",
      exp: "In 0-indexed languages, the initial element resides at index 0."
    },
    {
      q: `What is an index out of bounds error?`,
      opts: ["Accessing an array element outside its valid index range [0, size - 1]", "Declaring too many variables", "Using negative numbers in math functions", "Dividing by zero"],
      ans: "A",
      exp: "Accessing index < 0 or >= array size triggers an out of bounds error."
    },
    {
      q: `How do you access the third element of an array named arr in ${langUpper}?`,
      opts: ["arr[2]", "arr[3]", "arr(3)", "arr->3"],
      ans: "A",
      exp: "Because indexing starts at 0, the third element is at subscript index 2."
    },
    {
      q: `What is array traversal?`,
      opts: ["Visiting each element of an array sequentially to read or update values", "Sorting an array in reverse order", "Allocating array memory on heap", "Deleting all elements in array"],
      ans: "A",
      exp: "Array traversal accesses elements from index 0 to index size-1."
    },
    {
      q: `What is the output of: int nums[3] = {10, 20, 30}; nums[1] = 50; print(nums[1]); in ${langUpper}?`,
      opts: ["50", "20", "10", "30"],
      ans: "A",
      exp: "nums[1] is updated from 20 to 50, so printing nums[1] outputs 50."
    },
    {
      q: `What is a 2D array / matrix in ${langUpper}?`,
      opts: ["An array of arrays organized in rows and columns", "A 1D array containing floats", "An array with no fixed size", "A string container"],
      ans: "A",
      exp: "A 2D array represents grid data with row and column subscript indices matrix[row][col]."
    },
    {
      q: `In ${langUpper}, how is contiguous memory layout beneficial for arrays?`,
      opts: ["It enables O(1) constant-time direct element access via index calculation", "It automatically sorts elements", "It prevents array overflow", "It encrypts element data"],
      ans: "A",
      exp: "Contiguous memory allows calculating element address as base_address + index * element_size."
    },
    {
      q: `What method or property returns the number of elements in a list or array container in ${langUpper}?`,
      opts: [langUpper === "PYTHON" ? "len(arr)" : (langUpper === "CPP" ? "arr.size()" : "arr.length"), "arr.count()", "arr.max()", "arr.capacity()"],
      ans: "A",
      exp: `In ${langUpper}, array/list length is retrieved using ${langUpper === "PYTHON" ? "len()" : (langUpper === "CPP" ? ".size()" : ".length")}.`
    },
    {
      q: `What happens when you append an element to a dynamic array / vector in ${langUpper}?`,
      opts: ["The element is added at the end of the array, expanding its size", "The element replaces index 0", "All existing elements are deleted", "The array is cleared"],
      ans: "A",
      exp: "Pushing or appending places the new element past the current last index."
    },
    {
      q: `What is the time complexity of looking up an array element by its known index?`,
      opts: ["O(1)", "O(N)", "O(log N)", "O(N^2)"],
      ans: "A",
      exp: "Array subscript lookup is constant time O(1) because element location is computed directly."
    }
  ],
  recursion: (langUpper) => [
    {
      q: `What is the essential condition in a recursive function that stops further recursive calls?`,
      opts: ["Base case", "Recursive step", "Infinite loop", "Main function"],
      ans: "A",
      exp: "The base case provides a non-recursive return path that terminates recursion."
    },
    {
      q: `What error occurs when a recursive function lacks a base case in ${langUpper}?`,
      opts: ["Stack overflow (Maximum call stack size exceeded / Segmentation fault)", "Memory compaction error", "File not found error", "Syntax compilation error"],
      ans: "A",
      exp: "Infinite recursive invocation fills available call stack memory, causing stack overflow."
    },
    {
      q: `What data structure handles function call tracking during recursive execution?`,
      opts: ["Call stack", "Queue", "Heap", "Hash table"],
      ans: "A",
      exp: "The call stack manages local variables, parameter frames, and return addresses."
    },
    {
      q: `What is the return value of factorial(3) defined as: int fact(int n) { return (n <= 1) ? 1 : n * fact(n-1); }?`,
      opts: ["6", "3", "1", "9"],
      ans: "A",
      exp: "fact(3) = 3 * fact(2) = 3 * 2 * fact(1) = 3 * 2 * 1 = 6."
    },
    {
      q: `What is a recursive case?`,
      opts: ["The branch of a recursive function that reduces the problem and calls the function itself", "The branch that prints output", "The main entry point", "A syntax error"],
      ans: "A",
      exp: "The recursive case breaks down the input and invokes the function recursively on smaller inputs."
    }
  ],
  logic: (langUpper) => [
    {
      q: `In ${langUpper}, which operator represents the logical AND operation?`,
      opts: [langUpper === "PYTHON" ? "and" : "&&", "&", "AND", "=="],
      ans: "A",
      exp: "Logical AND yields true only if both evaluated operands are true."
    },
    {
      q: `What is short-circuit evaluation in boolean logic?`,
      opts: ["Stopping evaluation of a compound boolean expression as soon as the outcome is determined", "Bypassing compiler optimization", "Shortening variable names", "Executing loops faster"],
      ans: "A",
      exp: "For example, in (false && expr), expr is skipped because false AND anything is always false."
    },
    {
      q: `What is the result of the logical NOT operation on a true expression?`,
      opts: ["false", "true", "null", "1"],
      ans: "A",
      exp: "Logical NOT inverts boolean truth values, turning true into false."
    }
  ],
  syntax: (langUpper) => [
    {
      q: `In ${langUpper}, which symbol is used at the end of statements to denote completion in C/C++/Java?`,
      opts: [langUpper === "PYTHON" ? "Newline / Indentation" : "; (semicolon)", ": (colon)", ". (period)", ", (comma)"],
      ans: "A",
      exp: `In ${langUpper}, statement termination uses ${langUpper === "PYTHON" ? "newlines" : "semicolons"}.`
    },
    {
      q: `What is a syntax error?`,
      opts: ["A violation of the programming language's grammar rules detected during parsing/compilation", "A logic bug that produces wrong answers at runtime", "A slow network connection", "A missing database table"],
      ans: "A",
      exp: "Syntax errors occur when code structure violates language grammatical rules."
    }
  ],
  basics: (langUpper) => [
    {
      q: `What is the output of 15 % 4 (modulo operator) in ${langUpper}?`,
      opts: ["3", "3.75", "1", "4"],
      ans: "A",
      exp: "15 divided by 4 is 3 with a remainder of 3. The % operator returns the remainder (3)."
    },
    {
      q: `What is the primary function of a compiler or interpreter in programming?`,
      opts: ["Translating source code into executable instructions for the machine", "Editing text files", "Searching the internet", "Designing graphics"],
      ans: "A",
      exp: "Compilers/interpreters translate human-readable source code into machine-executable instructions."
    }
  ]
};

const generateFallbackQuizQuestions = (topics, language, neededCount, startIndex = 0) => {
  const langUpper = (language || "cpp").toUpperCase();
  const primaryTopic = topics && topics.length > 0 ? topics[0].toLowerCase().trim() : "variables";
  
  const bankFn = FALLBACK_TOPIC_BANKS[primaryTopic] || FALLBACK_TOPIC_BANKS.variables;
  const questionTemplates = bankFn(langUpper);

  const fallbackList = [];
  for (let i = 0; i < neededCount; i++) {
    const item = questionTemplates[(startIndex + i) % questionTemplates.length];
    fallbackList.push(
      shuffleQuestionOptions({
        question: item.q,
        options: item.opts,
        correctAnswer: item.ans,
        explanation: item.exp,
        topic: primaryTopic,
        difficulty: "medium",
      })
    );
  }
  return fallbackList;
};

  if (collectedQuestions.length < questionCount) {
    const needed = questionCount - collectedQuestions.length;
    const fallbacks = generateFallbackQuizQuestions(topics, targetLang, needed, collectedQuestions.length);
    for (const f of fallbacks) {
      collectedQuestions.push(f);
    }
  }

  // Final internal uniqueness assertion
  const uniqueCount = new Set(collectedQuestions.map((q) => normalizeQuestionText(q.question))).size;
  if (uniqueCount !== collectedQuestions.length) {
    console.warn("Internal duplicate questions detected within the generated quiz, re-sanitizing.");
  }

  return collectedQuestions.slice(0, questionCount);
};

const inFlightTodayQuizzes = new Map();

const getTodayQuiz = async ({ studentId, language }) => {
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);

  const endOfDay = new Date();
  endOfDay.setHours(23, 59, 59, 999);

  const studentObjectId = new mongoose.Types.ObjectId(studentId);

  // 1. Determine target language (Explicit parameter -> recent progress preference -> C++)
  let targetLang = language ? normalizeLanguage(language) : null;
  if (!targetLang) {
    const recentProgress = await Progress.findOne({ studentId: studentObjectId }).sort({ updatedAt: -1 });
    targetLang = recentProgress?.language ? normalizeLanguage(recentProgress.language) : "cpp";
  }

  const studentKey = `${studentId}_${targetLang}`;
  if (inFlightTodayQuizzes.has(studentKey)) {
    return inFlightTodayQuizzes.get(studentKey);
  }

  const quizPromise = (async () => {
    // 2. Check if today's quiz already exists for THIS student and language
    let quiz = await Quiz.findOne({
      studentId: studentObjectId,
      language: targetLang,
      createdAt: { $gte: startOfDay, $lte: endOfDay },
    }).lean();

    // If already exists, return with attempt status
    if (quiz) {
      const attempt = await QuizAttempt.findOne({
        quizId: quiz._id,
        studentId: studentObjectId,
      }).lean();

      // If quiz has fewer than 10 questions and was not attempted, upgrade it to 10 questions
      if (Array.isArray(quiz.questions) && quiz.questions.length < 10 && !attempt) {
        await Quiz.deleteOne({ _id: quiz._id });
        quiz = null;
      } else {
        // Remove correct answers if not yet attempted
        if (!attempt) {
          quiz.questions = quiz.questions.map((q) => {
            const { correctAnswer, ...rest } = q;
            return rest;
          });
        }

        return {
          quiz: quiz,
          attempt: attempt
            ? {
                score: attempt.score,
                completedAt: attempt.completedAt,
                answers: attempt.answers,
              }
            : null,
          isCompleted: !!attempt,
        };
      }
    }

    // 3. Find weak topics to target
    const weakProgress = await Progress.find({
      studentId: studentObjectId,
      language: targetLang,
    })
      .sort({ masteryScore: 1 })
      .limit(3);

    const targetTopics =
      weakProgress.length > 0
        ? weakProgress.map((p) => p.topic)
        : ["loops", "arrays", "basics"];

    // 4. Generate fresh, non-duplicating 10 questions
    const questions = await generateUniqueQuizQuestions({
      studentId,
      topics: targetTopics,
      language: targetLang,
      questionCount: 10,
      difficulty: "medium",
    });

    quiz = await Quiz.create({
      title: `Daily Quiz (${new Date().toLocaleDateString()}) - ${targetTopics.join(", ")} [${targetLang.toUpperCase()}]`,
      language: targetLang,
      topic: targetTopics[0],
      topics: targetTopics,
      questions,
      studentId,
      targetDate: startOfDay,
      createdBy: studentId,
    });

    const sanitized = quiz.toObject();
    sanitized.questions = sanitized.questions.map((q) => {
      const { correctAnswer, ...rest } = q;
      return rest;
    });

    return {
      quiz: sanitized,
      attempt: null,
      isCompleted: false,
    };
  })();

  inFlightTodayQuizzes.set(studentKey, quizPromise);
  try {
    return await quizPromise;
  } finally {
    inFlightTodayQuizzes.delete(studentKey);
  }
};

const submitQuiz = async ({ quizId, studentId, answers }) => {
  const quiz = await Quiz.findById(quizId);

  if (!quiz) {
    const error = new Error("Quiz not found");
    error.statusCode = 404;
    error.code = "QUIZ_NOT_FOUND";
    throw error;
  }

  if (!answers || answers.length !== quiz.questions.length) {
    const error = new Error("You must answer all quiz questions");
    error.statusCode = 400;
    error.code = "INVALID_ANSWERS";
    throw error;
  }

  let correctAnswers = 0;

  const evaluatedAnswers = quiz.questions.map((question, index) => {
    const selectedAnswer = answers[index]?.selectedAnswer || "";
    // Normalize both for letter comparison ("A" vs "A) ...")
    const cleanSelected = selectedAnswer.trim().charAt(0).toUpperCase();
    const cleanExpected = question.correctAnswer.trim().charAt(0).toUpperCase();
    const isCorrect =
      selectedAnswer.trim() === question.correctAnswer.trim() ||
      cleanSelected === cleanExpected;

    if (isCorrect) {
      correctAnswers++;
    }

    return {
      questionIndex: index,
      selectedAnswer,
      isCorrect,
    };
  });

  const score = Math.round((correctAnswers / quiz.questions.length) * 100);

  const attempt = await QuizAttempt.create({
    quizId,
    studentId,
    answers: evaluatedAnswers,
    score,
  });

  // Update progress for all quiz topics or primary topic
  const topicsToUpdate = quiz.topics && quiz.topics.length > 0 ? quiz.topics : [quiz.topic];
  for (const topic of topicsToUpdate) {
    await updateProgressFromQuiz({
      studentId,
      language: quiz.language,
      topic,
      quizScore: score,
    }).catch((err) => {
      console.warn("Failed to update progress from quiz:", err.message);
    });
  }

  // If quiz performance shows conceptual gaps (score < 60), record AI intervention
  if (score < 60) {
    try {
      const { recordIntervention } = require("../ai/aiIntervention.service");
      const primaryTopic = topicsToUpdate[0] || quiz.topic || "general";
      const progressBefore = await Progress.findOne({ 
        studentId, 
        topic: { $regex: new RegExp(`^${primaryTopic}$`, "i") } 
      }).select("masteryScore");
      const previousScore = progressBefore?.masteryScore ?? score;

      await recordIntervention({
        studentId,
        type: "QUIZ_DEFICIT",
        topic: primaryTopic,
        language: quiz.language,
        reason: `Quiz score was ${score}%, indicating conceptual gaps in ${primaryTopic}.`,
        recommendation: `Review ${primaryTopic} core rules and take targeted practice quizzes.`,
        previousScore,
        source: "QUIZ",
        referenceId: attempt._id,
      });
    } catch (err) {
      console.warn("Failed to record quiz intervention:", err.message);
    }
  }

  // Invalidate cached learning path so next view uses latest progress
  await AIAnalysis.deleteMany({
    studentId,
    type: "LEARNING_PATH",
  }).catch(() => {});

  // Invalidate cached student dashboard
  await invalidateStudentDashboardCache(studentId);

  return {
    attemptId: attempt._id,
    score,
    totalQuestions: quiz.questions.length,
    correctAnswers,
    answers: evaluatedAnswers,
    questions: quiz.questions, // Include explanations and correct answers upon submit
  };
};

const getQuizzes = async ({ language, topic }) => {
  const filter = {};

  if (language) {
    filter.language = normalizeLanguage(language);
  }

  if (topic) {
    filter.topic = topic;
  }

  const quizzes = await Quiz.find(filter)
    .select("-questions.correctAnswer")
    .sort({ createdAt: -1 });

  return quizzes;
};

const getQuizAttempts = async ({ quizId, studentId }) => {
  const quiz = await Quiz.findById(quizId);

  if (!quiz) {
    const error = new Error("Quiz not found");
    error.statusCode = 404;
    error.code = "QUIZ_NOT_FOUND";
    throw error;
  }

  const attempts = await QuizAttempt.find({
    quizId,
    studentId,
  }).sort({ createdAt: -1 });

  return attempts;
};

const getQuizById = async ({ quizId }) => {
  const quiz = await Quiz.findById(quizId).select("-questions.correctAnswer");

  if (!quiz) {
    const error = new Error("Quiz not found");
    error.statusCode = 404;
    error.code = "QUIZ_NOT_FOUND";
    throw error;
  }

  return quiz;
};

const getPracticeQuiz = async ({ studentId, language, topic }) => {
  const studentObjectId = new mongoose.Types.ObjectId(studentId);

  // 1. Determine target language (Explicit parameter -> recent progress preference -> C++)
  let targetLang = language ? normalizeLanguage(language) : null;
  if (!targetLang) {
    const recentProgress = await Progress.findOne({ studentId: studentObjectId }).sort({ updatedAt: -1 });
    targetLang = recentProgress?.language ? normalizeLanguage(recentProgress.language) : "cpp";
  }

  // 2. Determine target topic
  let targetTopic = topic;

  if (!targetTopic) {
    const weakProgress = await Progress.find({
      studentId: studentObjectId,
      language: targetLang,
      masteryScore: { $lt: 60 },
    })
      .sort({ masteryScore: 1 })
      .limit(1);

    if (weakProgress.length > 0) {
      targetTopic = weakProgress[0].topic;
    } else {
      targetTopic = "basics";
    }
  }

  // 3. Generate 10 distinct, non-duplicating practice questions with history exclusion
  const questions = await generateUniqueQuizQuestions({
    studentId,
    topics: [targetTopic],
    language: targetLang,
    questionCount: 10,
    difficulty: "medium",
  });

  const quiz = await Quiz.create({
    title: `AI Practice - ${targetTopic.charAt(0).toUpperCase() + targetTopic.slice(1)} [${targetLang.toUpperCase()}]`,
    language: targetLang,
    topic: targetTopic,
    topics: [targetTopic],
    questions,
    studentId: studentObjectId,
    createdBy: studentObjectId,
  });

  const sanitized = quiz.toObject();
  sanitized.questions = sanitized.questions.map((q) => {
    const { correctAnswer, ...rest } = q;
    return rest;
  });

  return {
    quiz: sanitized,
    attempt: null,
    isCompleted: false,
  };
};

module.exports = {
  createQuiz,
  createAIQuiz,
  getTodayQuiz,
  getPracticeQuiz,
  submitQuiz,
  getQuizzes,
  getQuizAttempts,
  getQuizById,
  validateQuestionTopic,
  validateQuestionLanguage,
  normalizeLanguage,
  generateUniqueQuizQuestions,
};
