const Joi = require("joi");

const testCaseSchema = Joi.object({
  input: Joi.string().allow("").required(),

  expectedOutput: Joi.string().allow("").required(),

  isHidden: Joi.boolean().optional(),
});

const exampleSchema = Joi.object({
  input: Joi.string().allow("").optional(),
  output: Joi.string().allow("").optional(),
  explanation: Joi.string().allow("").optional(),
});

const createAssignmentSchema = Joi.object({
  title: Joi.string()
    .trim()
    .min(2)
    .max(200)
    .required(),

  description: Joi.string()
    .trim()
    .min(1)
    .required(),

  problemStatement: Joi.string().trim().allow("").optional(),
  constraints: Joi.array().items(Joi.string().trim()).optional(),
  inputFormat: Joi.string().trim().allow("").optional(),
  outputFormat: Joi.string().trim().allow("").optional(),
  examples: Joi.array().items(exampleSchema).optional(),
  starterCode: Joi.string().allow("").optional(),
  hints: Joi.array().items(Joi.string().trim()).optional(),
  explanation: Joi.string().trim().allow("").optional(),
  source: Joi.string().valid("TEACHER", "AI_AGENT", "AI_GENERATED").optional(),

  language: Joi.string()
    .trim()
    .min(1)
    .max(50)
    .required(),

  difficulty: Joi.string()
    .valid("EASY", "MEDIUM", "HARD")
    .required(),

  topics: Joi.array()
    .items(
      Joi.string()
        .trim()
        .min(1)
        .max(50)
    )
    .optional(),

  testCases: Joi.array()
    .items(testCaseSchema)
    .optional(),

  deadline: Joi.date()
    .iso()
    .allow(null)
    .optional(),

  maxAttempts: Joi.number()
    .integer()
    .min(1)
    .allow(null)
    .optional(),

  classId: Joi.string()
    .trim()
    .required(),
});

const updateAssignmentSchema = Joi.object({
  title: Joi.string().trim().min(2).max(200),

  description: Joi.string().trim().min(1),

  problemStatement: Joi.string().trim().allow("").optional(),
  constraints: Joi.array().items(Joi.string().trim()).optional(),
  inputFormat: Joi.string().trim().allow("").optional(),
  outputFormat: Joi.string().trim().allow("").optional(),
  examples: Joi.array().items(exampleSchema).optional(),
  starterCode: Joi.string().allow("").optional(),
  hints: Joi.array().items(Joi.string().trim()).optional(),
  explanation: Joi.string().trim().allow("").optional(),

  language: Joi.string().trim().min(1).max(50),

  difficulty: Joi.string().valid("EASY", "MEDIUM", "HARD"),

  topics: Joi.array().items(Joi.string().trim().min(1).max(50)),

  testCases: Joi.array().items(testCaseSchema),

  deadline: Joi.date().iso().allow(null),

  maxAttempts: Joi.number()
    .integer()
    .min(1)
    .allow(null)
    .optional(),
}).min(1);

const generateAIAssignmentSchema = Joi.object({
  topic: Joi.string().trim().required(),
  language: Joi.string().valid("c", "cpp", "java", "python", "javascript").required(),
  difficulty: Joi.string().valid("EASY", "MEDIUM", "HARD", "easy", "medium", "hard").required(),
  questionCount: Joi.number().integer().min(1).max(5).default(1),
  classId: Joi.string().trim().optional(),
});

module.exports = {
  createAssignmentSchema,
  updateAssignmentSchema,
  generateAIAssignmentSchema,
};