const Joi = require("joi");

const createQuizSchema = Joi.object({
  title: Joi.string().trim().min(2).max(200).required(),

  language: Joi.string().trim().required(),

  topic: Joi.string().trim().required(),

  questions: Joi.array()
    .items(
      Joi.object({
        question: Joi.string().trim().required(),

        options: Joi.array()
          .items(Joi.string().trim().required())
          .min(2)
          .required(),

        correctAnswer: Joi.string().trim().required(),
      }),
    )
    .min(1)
    .required(),
});

const submitQuizSchema = Joi.object({
  answers: Joi.array()
    .items(
      Joi.object({
        selectedAnswer: Joi.string().allow("").required(),
      }),
    )
    .min(1)
    .required(),
});

module.exports = {
  createQuizSchema,
  submitQuizSchema,
};
