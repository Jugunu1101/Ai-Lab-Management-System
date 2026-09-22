require("dotenv").config();

const connectDB = require("../../config/db");

const {
  createSubmission,
  executeSubmission,
} = require("./submission.service");

const run = async () => {
    await connectDB();
    const submission = await createSubmission({
        assignmentId: "6a83401f86c376239011affd",
        userId: "6a82e028b20e96a67c7598be",
        code: `
        const fs = require("fs");

        const input = fs.readFileSync(0, "utf8").trim();

        console.log(Number(input) * 2);
        `,
        language: "javascript",
    });

  console.log("Created:", submission._id);

  const result = await executeSubmission({
    submissionId: submission._id,
  });

  console.log(
    JSON.stringify(result, null, 2)
  );
};

run();