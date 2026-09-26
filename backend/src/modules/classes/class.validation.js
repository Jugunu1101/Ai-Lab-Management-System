const Joi = require("joi");

const createClassSchema = Joi.object({
  name: Joi.string()
    .trim()
    .min(2)
    .max(100)
    .required(),

  code: Joi.string()
    .trim()
    .max(50)
    .allow("")
    .optional(),

  department: Joi.string()
    .trim()
    .max(100)
    .allow("")
    .optional(),

  description: Joi.string()
    .trim()
    .max(1000)
    .allow("")
    .optional(),

  languages: Joi.array()
    .items(
      Joi.string()
        .trim()
        .min(1)
        .max(50)
    )
    .default(["javascript", "python", "cpp", "java"])
    .optional(),

  semester: Joi.string()
    .trim()
    .max(50)
    .allow("")
    .optional(),
});

const addStudentSchema = Joi.object({
  studentId: Joi.string()
    .trim()
    .optional(),
  email: Joi.string()
    .email()
    .optional()
}).or("studentId", "email");

const joinClassSchema = Joi.object({
  code: Joi.string()
    .trim()
    .uppercase()
    .min(4)
    .max(10)
    .required()
    .messages({
      "string.empty": "Class code is required",
      "any.required": "Please enter a class code",
    }),
});

const updateClassSchema = Joi.object({
  name: Joi.string()
    .trim()
    .min(2)
    .max(100),

  languages: Joi.array()
    .items(
      Joi.string()
        .trim()
        .min(1)
        .max(50)
    )
    .min(1),

  semester: Joi.string()
    .trim()
    .max(50),
}).min(1);

module.exports = {
  createClassSchema,
  addStudentSchema,
  joinClassSchema,
  updateClassSchema,
};