const Assignment = require("./assignment.model");
const Class = require("../classes/class.model");
const Submission = require("../submissions/submission.model");
const mongoose = require("mongoose");

const aiService = require("../../services/ai/ai.service");

const normalizeText = (text) => {
  if (!text || typeof text !== "string") return "";
  return text
    .toLowerCase()
    .replace(/[^\w\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
};

const normalizeTitle = (title) => {
  return normalizeText(title);
};

const getStopWords = () =>
  new Set([
    "a", "an", "the", "of", "to", "in", "for", "from", "with", "using", "on", "and",
    "by", "at", "as", "is", "it", "or", "into", "via", "program", "code", "write",
    "calculate", "computation", "find", "determine", "compute", "check", "whether",
    "given", "print", "get", "all", "each", "numbers", "number", "integers", "integer",
    "that", "takes", "input", "output", "return", "returns", "result", "solution",
    "problem", "value", "values", "line", "single", "space", "separated",
    "where", "between", "up", "positive", "negative", "first", "last"
  ]);

const getCoreConceptTokens = (text) => {
  const normalized = normalizeText(text);
  if (!normalized) return [];
  const stopWords = getStopWords();
  return normalized
    .split(" ")
    .filter((w) => w.length > 1 && !stopWords.has(w));
};

const isTitleNearDuplicate = (newTitle, existingTitle) => {
  const normNew = normalizeText(newTitle);
  const normExist = normalizeText(existingTitle);
  if (!normNew || !normExist) return false;

  // Exact normalized match
  if (normNew === normExist) return true;

  // Prefix/Suffix containment check
  const stripPrefixes = (s) =>
    s
      .replace(/^(write a program to|create a program to|program to|find the|find|calculate the|calculate|compute the|compute|determine the|determine|check if|check whether|print the|print)\s+/i, "")
      .trim();
  const strippedNew = stripPrefixes(normNew);
  const strippedExist = stripPrefixes(normExist);
  if (strippedNew && strippedExist && (strippedNew === strippedExist || strippedNew.includes(strippedExist) || strippedExist.includes(strippedNew))) {
    if (Math.min(strippedNew.length, strippedExist.length) >= 6) {
      return true;
    }
  }

  // Token Jaccard similarity on core keywords
  const tokensNew = new Set(getCoreConceptTokens(newTitle));
  const tokensExist = new Set(getCoreConceptTokens(existingTitle));

  if (tokensNew.size === 0 || tokensExist.size === 0) {
    const allWordsNew = new Set(normNew.split(" ").filter(Boolean));
    const allWordsExist = new Set(normExist.split(" ").filter(Boolean));
    let intersectionCount = 0;
    for (const w of allWordsNew) {
      if (allWordsExist.has(w)) intersectionCount++;
    }
    const unionSize = new Set([...allWordsNew, ...allWordsExist]).size;
    return unionSize > 0 && intersectionCount / unionSize >= 0.65;
  }

  let coreIntersection = 0;
  for (const t of tokensNew) {
    if (tokensExist.has(t)) coreIntersection++;
  }
  const coreUnionSize = new Set([...tokensNew, ...tokensExist]).size;
  const jaccard = coreUnionSize > 0 ? coreIntersection / coreUnionSize : 0;

  if (jaccard >= 0.6) return true;

  const minTokensSize = Math.min(tokensNew.size, tokensExist.size);
  const containmentRatio = minTokensSize > 0 ? coreIntersection / minTokensSize : 0;

  if (coreIntersection >= 2 && (containmentRatio >= 0.8 || coreIntersection === minTokensSize)) {
    return true;
  }

  return false;
};

const isProblemStatementNearDuplicate = (prob1, prob2) => {
  const norm1 = normalizeText(prob1);
  const norm2 = normalizeText(prob2);
  if (!norm1 || !norm2) return false;

  // Exact normalized match
  if (norm1 === norm2) return true;

  // Substring containment check for longer problem statements
  if (norm1.length >= 20 && norm2.length >= 20) {
    if (norm1.includes(norm2) || norm2.includes(norm1)) {
      return true;
    }
  }

  // Core concept token overlap
  const tokens1 = getCoreConceptTokens(prob1);
  const tokens2 = getCoreConceptTokens(prob2);
  const set1 = new Set(tokens1);
  const set2 = new Set(tokens2);

  if (set1.size === 0 || set2.size === 0) return false;

  let intersectionCount = 0;
  for (const t of set1) {
    if (set2.has(t)) intersectionCount++;
  }
  const unionSize = new Set([...set1, ...set2]).size;
  const jaccard = unionSize > 0 ? intersectionCount / unionSize : 0;

  if (jaccard >= 0.65) return true;

  const minTokens = Math.min(set1.size, set2.size);
  const containment = minTokens > 0 ? intersectionCount / minTokens : 0;

  if (minTokens >= 2 && containment >= 0.8 && intersectionCount >= 2) {
    return true;
  }

  // Bigram overlap check
  const getBigrams = (words) => {
    const bigrams = new Set();
    for (let i = 0; i < words.length - 1; i++) {
      bigrams.add(`${words[i]}_${words[i + 1]}`);
    }
    return bigrams;
  };

  const words1 = norm1.split(" ").filter(Boolean);
  const words2 = norm2.split(" ").filter(Boolean);
  const bigrams1 = getBigrams(words1);
  const bigrams2 = getBigrams(words2);

  if (bigrams1.size > 0 && bigrams2.size > 0) {
    let bigramIntersection = 0;
    for (const b of bigrams1) {
      if (bigrams2.has(b)) bigramIntersection++;
    }
    const minBigrams = Math.min(bigrams1.size, bigrams2.size);
    if (minBigrams >= 4 && bigramIntersection / minBigrams >= 0.65) {
      return true;
    }
  }

  return false;
};

const isNearDuplicateAssignment = (generated, existing) => {
  if (!existing) return false;

  const existingTitle = typeof existing === "string" ? existing : existing.title;
  const existingProb = typeof existing === "string" ? "" : (existing.problemStatement || existing.description || "");

  // 1. Check title similarity
  if (existingTitle && isTitleNearDuplicate(generated.title, existingTitle)) {
    return true;
  }

  // 2. Check problem statement / question similarity
  const genProb = generated.problemStatement || generated.description || "";
  if (genProb && existingProb && isProblemStatementNearDuplicate(genProb, existingProb)) {
    return true;
  }

  return false;
};

// Aliased helper for backward compatibility
const isNearDuplicate = (newTitle, existingTitle) => isTitleNearDuplicate(newTitle, existingTitle);

const MAX_GENERATION_ATTEMPTS = 5;

const createAssignment = async ({
  title,
  description,
  problemStatement,
  constraints,
  inputFormat,
  outputFormat,
  examples,
  starterCode,
  hints,
  explanation,
  language,
  difficulty,
  topics,
  testCases,
  deadline,
  maxAttempts,
  classId,
  teacherId,
  source = "TEACHER",
  assignedTo,
  agentReason,
}) => {
  const classData = await Class.findById(classId);

  if (!classData) {
    const error = new Error("Class not found");
    error.statusCode = 404;
    error.code = "CLASS_NOT_FOUND";
    throw error;
  }

  if (classData.teacherId.toString() !== teacherId) {
    const error = new Error(
      "You do not have permission to create an assignment for this class"
    );
    error.statusCode = 403;
    error.code = "FORBIDDEN";
    throw error;
  }

  // Scoped title uniqueness check within the target class
  if (title && classId) {
    const normalizedNew = normalizeTitle(title);
    const existingClassAssignments = await Assignment.find({ classId }).select("title");
    const duplicateExists = existingClassAssignments.some((a) => normalizeTitle(a.title) === normalizedNew);
    if (duplicateExists) {
      const error = new Error("An assignment with this title already exists in this class");
      error.statusCode = 409;
      error.code = "DUPLICATE_ASSIGNMENT_TITLE";
      throw error;
    }
  }

  const assignment = await Assignment.create({
    title,
    description,
    problemStatement,
    constraints,
    inputFormat,
    outputFormat,
    examples,
    starterCode,
    hints,
    explanation,
    language,
    difficulty,
    topics,
    testCases,
    deadline,
    maxAttempts,
    classId,
    createdBy: teacherId,
    source,
    assignedTo,
    agentReason,
  });

  return assignment;
};

const generateAIAssignment = async ({
  topic,
  language,
  difficulty,
  questionCount = 1,
  classId,
  teacherId,
  excludedTitles = [],
  excludedAssignments = [],
  currentTitle,
}) => {
  const initialExclusions = [];
  if (Array.isArray(excludedTitles)) initialExclusions.push(...excludedTitles);
  if (Array.isArray(excludedAssignments)) initialExclusions.push(...excludedAssignments);
  if (currentTitle && typeof currentTitle === "string" && currentTitle.trim()) {
    initialExclusions.push(currentTitle.trim());
  }

  let existingAssignmentsList = [];
  const filterConditions = [];

  if (classId) {
    const classData = await Class.findById(classId);
    if (!classData) {
      const error = new Error("Class not found");
      error.statusCode = 404;
      error.code = "CLASS_NOT_FOUND";
      throw error;
    }

    if (classData.teacherId.toString() !== teacherId) {
      const error = new Error("You do not have permission for this class");
      error.statusCode = 403;
      error.code = "FORBIDDEN";
      throw error;
    }

    filterConditions.push({ classId });
  }

  if (teacherId) {
    const teacherObjectId = mongoose.Types.ObjectId.isValid(teacherId)
      ? new mongoose.Types.ObjectId(teacherId)
      : teacherId;

    // Collect all classes owned by this instructor across the platform
    const teacherClasses = await Class.find({ teacherId }).select("_id").lean();
    const teacherClassIds = teacherClasses.map((c) => c._id);

    filterConditions.push(
      { createdBy: teacherId },
      { createdBy: teacherObjectId },
      { classId: { $in: teacherClassIds } }
    );
  }

  if (filterConditions.length > 0) {
    const existingAssignments = await Assignment.find({
      $or: filterConditions,
    })
      .select("title problemStatement description topic language difficulty")
      .lean();

    existingAssignmentsList = existingAssignments.map((a) => ({
      title: a.title,
      problemStatement: a.problemStatement || a.description || "",
      topic: a.topic || (a.topics && a.topics[0]) || "",
      language: a.language || "",
      difficulty: a.difficulty || "",
    }));
  }

  // Structured exclusions containing { title, problemStatement }
  const accumulatedExclusions = [];

  for (const item of initialExclusions) {
    if (typeof item === "string" && item.trim()) {
      accumulatedExclusions.push({ title: item.trim(), problemStatement: "" });
    } else if (item && typeof item === "object") {
      accumulatedExclusions.push({
        title: item.title || "",
        problemStatement: item.problemStatement || item.description || "",
      });
    }
  }

  for (const item of existingAssignmentsList) {
    if (!accumulatedExclusions.some((e) => e.title === item.title)) {
      accumulatedExclusions.push(item);
    }
  }

  let attempt = 0;

  while (attempt < MAX_GENERATION_ATTEMPTS) {
    attempt++;

    // Format exclusion payload for AI service (title + problem context)
    const formattedExclusions = accumulatedExclusions.map((e) =>
      e.problemStatement ? `${e.title}: ${e.problemStatement}` : e.title
    );

    const generated = await aiService.generateAssignment({
      topic,
      targetTopics: [topic],
      language,
      difficulty: (difficulty || "MEDIUM").toUpperCase(),
      questionCount: questionCount || 1,
      excludedTitles: formattedExclusions,
    });

    if (!generated || !generated.title) {
      continue;
    }

    // Quality & internal consistency validation
    if (!Array.isArray(generated.testCases) || generated.testCases.length < 2) {
      continue;
    }
    if (!generated.problemStatement || !generated.starterCode) {
      continue;
    }

    // Uniqueness & Duplicate/Near-Duplicate check against accumulated exclusions (title AND problem statement)
    const isDup = accumulatedExclusions.some((existing) =>
      isNearDuplicateAssignment(generated, existing)
    );

    if (!isDup) {
      return generated;
    }

    // Duplicate detected, record for next retry
    accumulatedExclusions.push({
      title: generated.title,
      problemStatement: generated.problemStatement || generated.description || "",
    });
  }

  const error = new Error(
    "AI generated a duplicate assignment after multiple attempts. Please try again."
  );
  error.statusCode = 409;
  error.code = "DUPLICATE_ASSIGNMENT_GENERATED";
  throw error;
};

const getAssignments = async ({ userId, role, limit, page, search, topic, difficulty }) => {
  let classIds = [];
  const classMap = new Map();

  let query = {};

  if (role === "TEACHER") {
    const classes = await Class.find({
      teacherId: userId,
    }).select("_id name semester").lean();

    classIds = classes.map((classData) => classData._id);
    classes.forEach((c) => classMap.set(c._id.toString(), c));

    query = {
      classId: { $in: classIds },
    };
  }

  if (role === "STUDENT") {
    const studentObjectId = mongoose.Types.ObjectId.isValid(userId)
      ? new mongoose.Types.ObjectId(userId)
      : userId;

    const classes = await Class.find({
      $or: [
        { students: userId },
        { students: studentObjectId },
        { students: { $in: [userId, studentObjectId] } },
      ],
    }).select("_id name code semester teacherId").lean();

    classIds = classes.map((classData) => classData._id);
    classes.forEach((c) => classMap.set(c._id.toString(), c));

    query = {
      $or: [
        {
          classId: { $in: classIds },
          $or: [
            { assignedTo: { $exists: false } },
            { assignedTo: null },
            { assignedTo: userId },
            { assignedTo: studentObjectId },
          ],
        },
        { assignedTo: userId },
        { assignedTo: studentObjectId },
      ],
    };
  }

  const andConditions = [];
  if (Object.keys(query).length > 0) {
    andConditions.push(query);
  }

  if (search && search.trim()) {
    const sanitized = search.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const searchRegex = new RegExp(sanitized, "i");
    andConditions.push({
      $or: [
        { title: searchRegex },
        { description: searchRegex },
        { problemStatement: searchRegex },
        { topics: searchRegex },
        { language: searchRegex },
      ],
    });
  }

  if (topic && topic !== "ALL" && topic.trim()) {
    const sanitizedTopic = topic.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    andConditions.push({
      topics: new RegExp(sanitizedTopic, "i"),
    });
  }

  if (difficulty && difficulty !== "ALL" && difficulty.trim()) {
    andConditions.push({
      difficulty: difficulty.trim().toUpperCase(),
    });
  }

  const finalQuery = andConditions.length > 1
    ? { $and: andConditions }
    : andConditions.length === 1
    ? andConditions[0]
    : {};

  let assignmentQuery = Assignment.find(finalQuery)
    .select("-testCases -starterCode -hints -explanation -problemStatement -constraints -inputFormat -outputFormat -examples")
    .sort({ createdAt: -1 });

  if (limit && Number(limit) > 0) {
    const numLimit = parseInt(limit, 10);
    const numPage = page && Number(page) > 0 ? parseInt(page, 10) : 1;
    assignmentQuery = assignmentQuery.skip((numPage - 1) * numLimit).limit(numLimit);
  }

  const assignments = await assignmentQuery.lean();

  // Populate classId from in-memory map without extra network round-trips
  assignments.forEach((a) => {
    if (a.classId && classMap.has(a.classId.toString())) {
      a.classId = classMap.get(a.classId.toString());
    }
  });

  if (role === "STUDENT") {
    const assignmentIds = assignments.map((a) => a._id);
    const submissions = await Submission.find({
      userId,
      assignmentId: { $in: assignmentIds },
    })
      .select("assignmentId score status createdAt")
      .sort({ createdAt: -1 })
      .lean();

    const submissionMap = {};
    for (const sub of submissions) {
      if (!submissionMap[sub.assignmentId]) {
        submissionMap[sub.assignmentId] = {
          attempts: 0,
          bestScore: 0,
          latest: null,
          passed: false
        };
      }
      const sm = submissionMap[sub.assignmentId];
      sm.attempts += 1;
      if (sub.score > sm.bestScore) sm.bestScore = sub.score;
      if (sub.status === "PASSED") sm.passed = true;
      if (!sm.latest) sm.latest = sub;
    }

    return assignments.map((a) => {
      const sm = submissionMap[a._id];
      if (sm) {
        return {
          ...a,
          status: sm.passed ? "COMPLETED" : sm.latest.status,
          score: sm.bestScore,
          attempts: sm.attempts,
          latestSubmissionId: sm.latest._id,
          latestSubmittedAt: sm.latest.createdAt,
          passed: sm.passed
        };
      }
      return {
        ...a,
        status: "NOT_STARTED",
        score: 0,
        attempts: 0,
        passed: false
      };
    });
  }

  if (role === "TEACHER") {
    const assignmentIds = assignments.map((a) => a._id);
    const submissions = await Submission.find({
      assignmentId: { $in: assignmentIds }
    }).lean();
    
    const submissionStats = {};
    for (const sub of submissions) {
      if (!submissionStats[sub.assignmentId]) {
        submissionStats[sub.assignmentId] = {
          uniqueStudents: new Set(),
          passedCount: 0,
        };
      }
      const stats = submissionStats[sub.assignmentId];
      stats.uniqueStudents.add(sub.userId.toString());
      if (sub.status === "PASSED") {
        // Just checking if any submission from this student passed, we could be more rigorous
        // but for now let's just count total passed submissions or passed students.
        // Let's count unique students who have at least one PASSED submission.
      }
    }

    // A better approach for passed count: unique students who passed
    const passedStudentsMap = {};
    for (const sub of submissions) {
      if (sub.status === "PASSED") {
        if (!passedStudentsMap[sub.assignmentId]) passedStudentsMap[sub.assignmentId] = new Set();
        passedStudentsMap[sub.assignmentId].add(sub.userId.toString());
      }
    }

    return assignments.map((a) => {
      const stats = submissionStats[a._id];
      const passed = passedStudentsMap[a._id];
      return {
        ...a,
        submissionsCount: stats ? stats.uniqueStudents.size : 0,
        passedCount: passed ? passed.size : 0,
      };
    });
  }

  return assignments;
};

const getAssignmentById = async ({
  assignmentId,
  userId,
  role,
}) => {
  const assignment = await Assignment.findById(assignmentId)
    .populate("classId", "name semester teacherId students")
    .populate("createdBy", "name email");

  if (!assignment) {
    const error = new Error("Assignment not found");
    error.statusCode = 404;
    error.code = "ASSIGNMENT_NOT_FOUND";
    throw error;
  }

  const classData = assignment.classId;

  if (role === "TEACHER") {
    if (classData && classData.teacherId && classData.teacherId.toString() !== userId) {
      const error = new Error(
        "You do not have access to this assignment"
      );
      error.statusCode = 403;
      error.code = "FORBIDDEN";
      throw error;
    }
  }

  if (role === "STUDENT") {
    const isEnrolled = classData && classData.students ? classData.students.some(
      (studentId) => studentId.toString() === userId
    ) : false;

    const isAssignedDirectly = assignment.assignedTo && assignment.assignedTo.toString() === userId;

    if (!isEnrolled && !isAssignedDirectly) {
      const error = new Error(
        "You do not have access to this assignment"
      );
      error.statusCode = 403;
      error.code = "FORBIDDEN";
      throw error;
    }
    
    if (assignment.assignedTo && assignment.assignedTo.toString() !== userId) {
      const error = new Error(
        "You do not have access to this personalized assignment"
      );
      error.statusCode = 403;
      error.code = "FORBIDDEN";
      throw error;
    }

    assignment.testCases = assignment.testCases.filter(
      (testCase) => !testCase.isHidden
    );
  }

  return assignment;
};

const updateAssignment = async ({
  assignmentId,
  teacherId,
  updates,
}) => {
  const assignment = await Assignment.findById(assignmentId);

  if (!assignment) {
    const error = new Error("Assignment not found");
    error.statusCode = 404;
    error.code = "ASSIGNMENT_NOT_FOUND";
    throw error;
  }

  const classData = await Class.findById(assignment.classId);

  if (!classData) {
    const error = new Error("Class not found");
    error.statusCode = 404;
    error.code = "CLASS_NOT_FOUND";
    throw error;
  }

  if (classData.teacherId.toString() !== teacherId) {
    const error = new Error(
      "You do not have permission to update this assignment"
    );
    error.statusCode = 403;
    error.code = "FORBIDDEN";
    throw error;
  }

  if (updates.title !== undefined) {
    assignment.title = updates.title;
  }

  if (updates.description !== undefined) {
    assignment.description = updates.description;
  }

  if (updates.language !== undefined) {
    assignment.language = updates.language;
  }

  if (updates.difficulty !== undefined) {
    assignment.difficulty = updates.difficulty;
  }

  if (updates.topics !== undefined) {
    assignment.topics = updates.topics;
  }

  if (updates.testCases !== undefined) {
    assignment.testCases = updates.testCases;
  }

  if (updates.deadline !== undefined) {
    assignment.deadline = updates.deadline;
  }

  if (updates.maxAttempts !== undefined) {
    assignment.maxAttempts = updates.maxAttempts;
  }

  await assignment.save();

  return assignment;
};

const deleteAssignment = async ({
  assignmentId,
  teacherId,
}) => {
  const assignment = await Assignment.findById(assignmentId);

  if (!assignment) {
    const error = new Error("Assignment not found");
    error.statusCode = 404;
    error.code = "ASSIGNMENT_NOT_FOUND";
    throw error;
  }

  const classData = await Class.findById(assignment.classId);

  if (!classData) {
    const error = new Error("Class not found");
    error.statusCode = 404;
    error.code = "CLASS_NOT_FOUND";
    throw error;
  }

  if (classData.teacherId.toString() !== teacherId) {
    const error = new Error(
      "You do not have permission to delete this assignment"
    );
    error.statusCode = 403;
    error.code = "FORBIDDEN";
    throw error;
  }

  await Assignment.findByIdAndDelete(assignmentId);

  return assignment;
};

const getAssignmentResults = async ({ assignmentId, teacherId }) => {
  const assignment = await Assignment.findById(assignmentId);

  if (!assignment) {
    const error = new Error("Assignment not found");
    error.statusCode = 404;
    error.code = "ASSIGNMENT_NOT_FOUND";
    throw error;
  }

  const classData = await Class.findById(assignment.classId);

  if (!classData) {
    const error = new Error("Class not found");
    error.statusCode = 404;
    error.code = "CLASS_NOT_FOUND";
    throw error;
  }

  if (classData.teacherId.toString() !== teacherId) {
    const error = new Error(
      "You do not have access to this assignment results",
    );

    error.statusCode = 403;
    error.code = "FORBIDDEN";

    throw error;
  }

  const submissions = await Submission.find({
    assignmentId,
  })
    .populate("userId", "name email")
    .sort({ createdAt: -1 });

  const studentResults = {};

  // Initialize with all students in the class
  if (classData.students && classData.students.length > 0) {
    const studentsData = await mongoose.model("User").find({
      _id: { $in: classData.students }
    }, "name email");
    
    for (const student of studentsData) {
      studentResults[student._id.toString()] = {
        student: student,
        attempts: 0,
        bestScore: 0,
        latestScore: 0,
        latestStatus: "NOT_SUBMITTED",
        latestSubmissionAt: null,
        latestSubmission: null,
      };
    }
  }

  for (const submission of submissions) {
    const studentId = submission.userId._id.toString();

    if (!studentResults[studentId]) {
      studentResults[studentId] = {
        student: submission.userId,
        attempts: 0,
        bestScore: 0,
        latestScore: submission.score,
        latestStatus: submission.status,
        latestSubmissionAt: submission.createdAt,
        latestSubmission: submission,
      };
    }

    if (studentResults[studentId].attempts === 0) {
      // First time we see a submission for this student (it's the latest because of sort)
      studentResults[studentId].latestScore = submission.score;
      studentResults[studentId].latestStatus = submission.status;
      studentResults[studentId].latestSubmissionAt = submission.createdAt;
      studentResults[studentId].latestSubmission = submission;
    }

    studentResults[studentId].attempts += 1;

    if (submission.score > studentResults[studentId].bestScore) {
      studentResults[studentId].bestScore = submission.score;
    }
  }

  return Object.values(studentResults);
};

module.exports = {
  createAssignment,
  generateAIAssignment,
  getAssignments,
  getAssignmentById,
  updateAssignment,
  deleteAssignment,
  getAssignmentResults,
  normalizeTitle,
  isNearDuplicate,
  isTitleNearDuplicate,
  isProblemStatementNearDuplicate,
  isNearDuplicateAssignment,
};