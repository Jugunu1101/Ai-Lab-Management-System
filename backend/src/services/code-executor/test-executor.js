const {
  executeTestCases,
} = require("./test-case.service");

const run = async () => {
  const result = await executeTestCases({
    code: `
      const fs = require("fs");

      const input = fs.readFileSync(0, "utf8").trim();

      console.log(Number(input) + 1);
    `,

    testCases: [
      {
        input: "5",
        expectedOutput: "10",
      },
      {
        input: "10",
        expectedOutput: "20",
      },
      {
        input: "7",
        expectedOutput: "14",
      },
    ],
  });

  console.log(
    JSON.stringify(result, null, 2)
  );
};

run();