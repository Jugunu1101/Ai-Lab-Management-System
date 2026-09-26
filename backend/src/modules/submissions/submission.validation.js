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
  assignmentId: Joi.string().trim().required(),
  code: Joi.string().required().min(1),
  language: Joi.string().trim().min(1).max(50).required(),
});

module.exports = {
  createSubmissionSchema,
  runTestsSchema,
};