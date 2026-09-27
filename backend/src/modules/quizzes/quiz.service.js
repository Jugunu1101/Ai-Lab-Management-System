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
  loops: (text) => {
    // Must contain meaningful loop construct / keyword
    const loopRegex = /\b(for\s+|while\s+|range\s*\(|break\b|continue\b|iterat|nested\s+loop|loop|loops|looping|enumerate\s*\(|zip\s*\()/i;
    // Standalone arithmetic questions without any loop construct are rejected
    const standaloneArithmeticRegex = /what\s+is\s+the\s+output\s+of\s+(the\s+)?arithmetic\s+expression/i;
    if (standaloneArithmeticRegex.test(text) && !loopRegex.test(text)) {
      return false;
    }
    return loopRegex.test(text);
  },
  arrays: (text) => {
    return /\b(array|arrays|list|lists|index|indexing|slice|slicing|append|pop|insert|reverse|extend|len\s*\(|element|elements|subscript|vector)\b|\[\s*[\d'"]*[\w\s,]*\]/i.test(text);
  },
  recursion: (text) => {
    return /\b(recurs|recursive|recursively|recursion|base\s+case|call\s+stack|recursionerror|depth|calls\s+itself)\b/i.test(text);
  },
  searching: (text) => {
    return /\b(search|searching|binary\s+search|linear\s+search|sorted\s+array|target|comparisons?)\b/i.test(text);
  },
  logic: (text) => {
    return /\b(bool|boolean|true|false|and|or|not|conditional|if|else|elif|ternary|comparison|truthy|falsy|!=|==|<=|>=)\b/i.test(text);
  },
  syntax: (text) => {
    return /\b(def\b|return|lambda|function|parameter|argument|indent|indentation|try|except|finally|raise|import|scope|global|nonlocal|pass\b|docstring|comment|syntax|colon|keyword)\b/i.test(text);
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

  // 1. Direct topic metadata match
  if (question.topic) {
    const qTopic = question.topic.toLowerCase().trim();
    if (topics.some((t) => qTopic === t || qTopic.includes(t) || t.includes(qTopic))) {
      return true;
    }
  }

  // 2. Build combined text to analyze: question + options + explanation
  const optionsText = Array.isArray(question.options) ? question.options.join(" ") : "";
  const combinedText = `${question.question} ${optionsText} ${question.explanation || ""}`;

  // Check if it satisfies ANY of the requested topics
  return topics.some((topicKey) => {
    const validator = TOPIC_VALIDATORS[topicKey];
    if (validator) {
      return validator(combinedText);
    }
    // Fallback for custom topic names: check if topic name or word is mentioned in question
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

const generateFallbackQuizQuestions = (topics, language, neededCount, startIndex = 0) => {
  const langUpper = (language || "cpp").toUpperCase();
  const primaryTopic = topics && topics.length > 0 ? topics[0] : "loops";
  
  const questionTemplates = [
    {
      q: `What is the time complexity of traversing an array of size N in ${langUpper}?`,
      opts: ["O(1)", "O(N)", "O(N^2)", "O(log N)"],
      ans: "B",
      exp: "A linear scan through N elements requires visiting each element once, which is O(N) time."
    },
    {
      q: `In ${langUpper}, which loop construct is guaranteed to execute its body at least once?`,
      opts: ["for loop", "while loop", "do-while loop", "foreach loop"],
      ans: "C",
      exp: "A do-while loop evaluates its conditional expression after executing the body once."
    },
    {
      q: `What will happen if an infinite loop executes in a running process?`,
      opts: ["Process finishes immediately", "CPU usage stays at 100% until timeout or termination", "Memory leaks immediately to 0", "Compiler throws a syntax error"],
      ans: "B",
      exp: "An infinite loop without termination keeps utilizing CPU cycles continuously."
    },
    {
      q: `What is the primary purpose of a loop termination condition?`,
      opts: ["To optimize memory allocation", "To prevent infinite iteration and exit loop cleanly", "To define variable scope", "To invoke garbage collection"],
      ans: "B",
      exp: "The termination condition checks whether iteration should continue or exit."
    },
    {
      q: `Which keyword is used to skip the current iteration of a loop in ${langUpper}?`,
      opts: ["break", "return", "continue", "skip"],
      ans: "C",
      exp: "The continue statement bypasses the remaining loop statements and advances to the next iteration."
    },
    {
      q: `Which keyword terminates the entire loop immediately in ${langUpper}?`,
      opts: ["stop", "break", "exit", "terminate"],
      ans: "B",
      exp: "The break statement terminates execution of the nearest enclosing loop or switch."
    },
    {
      q: `What is an index out of bounds error?`,
      opts: ["Accessing an array element outside its valid index range", "Declaring too many variables", "Using negative numbers in math functions", "Dividing by zero"],
      ans: "A",
      exp: "Attempting to access an index < 0 or >= size results in an index out of bounds condition."
    },
    {
      q: `What is the 0-based index of the first element in an array?`,
      opts: ["-1", "0", "1", "2"],
      ans: "B",
      exp: "In 0-indexed languages like C, C++, Java, and Python, the first element resides at index 0."
    },
    {
      q: `In ${langUpper}, which operator represents the logical AND operation?`,
      opts: ["&", "&&", "AND", "=="],
      ans: "B",
      exp: "&& is the logical AND operator that evaluates to true only if both operands are true."
    },
    {
      q: `What is a common cause of off-by-one errors in loop conditions?`,
      opts: ["Using < instead of <= (or vice-versa) on boundary indices", "Naming variables incorrectly", "Using floats instead of doubles", "Adding comments inside loop"],
      ans: "A",
      exp: "Off-by-one errors frequently arise when boundary comparisons (< vs <=) mismatch the collection size."
    },
    {
      q: `What is the space complexity of an in-place array reversal?`,
      opts: ["O(N)", "O(1)", "O(log N)", "O(N^2)"],
      ans: "B",
      exp: "In-place reversal operates with two pointers using constant extra auxiliary space O(1)."
    },
    {
      q: `Which control structure is best suited when the exact number of iterations is known beforehand?`,
      opts: ["while loop", "for loop", "do-while loop", "try-catch"],
      ans: "B",
      exp: "A for loop provides compact initialization, condition, and increment in a single header."
    }
  ];

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
