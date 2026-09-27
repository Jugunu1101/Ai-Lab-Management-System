const Joi = require("joi");

const createSubmissionSchema = Joi.object({
  assignmentId: Joi.string()
    .trim()
    .required(),

  code: Joi.string()
    .required()
    .min(1),

  language: Joi.string()
    .trim()
    .min(1)
    .max(50)
    .required(),
});

const runTestsSchema = Joi.object({
  assignmentId: Joi.string().trim().optional().allow(null, ""),
  code: Joi.string().required().min(1),
  language: Joi.string().trim().min(1).max(50).required(),
  testCases: Joi.array()
    .items(
      Joi.object({
        input: Joi.string().allow("").optional(),
        expectedOutput: Joi.string().allow("").optional(),
        isHidden: Joi.boolean().optional(),
      }).unknown(true)
    )
    .optional(),
});


module.exports = {
  createSubmissionSchema,
  runTestsSchema,
};