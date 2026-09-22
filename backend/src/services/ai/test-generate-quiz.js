require("dotenv").config();

const { generateQuiz } = require("./ai.service");

const run = async () => {
  try {
    const result = await generateQuiz({
      student: {
        id: "123",
      },

      topics: ["arrays"],
      
      language: "javascript",

      questionCount: 5,
    });

    console.log(JSON.stringify(result, null, 2));
  } catch (error) {
    console.error({
      status: error.statusCode,
      code: error.code,
      message: error.message,
    });
  }
};

run();
