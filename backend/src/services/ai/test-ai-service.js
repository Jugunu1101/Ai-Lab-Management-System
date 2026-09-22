require("dotenv").config();

const { analyzeSubmission } = require("./ai.service");

const run = async () => {
  try {
    const result = await analyzeSubmission({
      student: {
        id: "123",
      },

      assignment: {
        id: "456",
        language: "javascript",
        topics: ["arrays", "loops"],
      },

      submission: {
        code: `
const arr = [1, 2, 3];

for (let i = 0; i <= arr.length; i++) {
  console.log(arr[i]);
}
        `,
      },

      testResults: {
        passed: 6,
        failed: 4,
      },
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
