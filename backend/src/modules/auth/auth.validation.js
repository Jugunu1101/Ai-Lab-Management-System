const Joi = require("joi");

const registerSchema = Joi.object({
  name: Joi.string().trim().min(2).max(100).required(),

  email: Joi.string().trim().lowercase().email().required(),

  password: Joi.string().min(6).max(100).required(),

  role: Joi.string().valid("STUDENT", "TEACHER").default("STUDENT").optional(),

  collegeId: Joi.string().trim().max(100).allow("").optional(),

  department: Joi.string().trim().max(100).allow("").optional(),
});

const loginSchema = Joi.object({
  email: Joi.string().trim().lowercase().email().required(),

  password: Joi.string().required(),
});

module.exports = {
  registerSchema,
  loginSchema,
};