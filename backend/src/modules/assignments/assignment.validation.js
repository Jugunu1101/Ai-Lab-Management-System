const Joi = require("joi");

const testCaseSchema = Joi.object({
  input: Joi.string()
    .required(),

  expectedOutput: Joi.string()
    .required(),

  isHidden: Joi.boolean()
    .optional(),
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

module.exports = {
  createAssignmentSchema,
  updateAssignmentSchema,
};