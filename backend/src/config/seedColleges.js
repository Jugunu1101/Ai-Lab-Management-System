const College = require("../modules/colleges/college.model");

const DEFAULT_COLLEGES = [
  {
    name: "MIT Institute of Technology",
    code: "MIT",
    domains: ["mit.edu", "student.mit.edu"],
    departments: ["Computer Science", "Electrical Engineering", "AI & Robotics"],
    website: "https://mit.edu",
    status: "ACTIVE",
  },
  {
    name: "Stanford University",
    code: "STANFORD",
    domains: ["stanford.edu", "alumni.stanford.edu"],
    departments: ["Computer Science", "Information Systems", "Data Science"],
    website: "https://stanford.edu",
    status: "ACTIVE",
  },
  {
    name: "Apex Engineering College",
    code: "APEX",
    domains: ["apex.edu", "student.apex.edu", "college.edu"],
    departments: ["Computer Science", "Information Technology", "Electronics"],
    website: "https://apex.edu",
    status: "ACTIVE",
  },
];

const seedDefaultColleges = async () => {
  try {
    for (const data of DEFAULT_COLLEGES) {
      const exists = await College.findOne({ code: data.code });
      if (!exists) {
        await College.create(data);
        console.log(`[Seed] Created default college: ${data.name} (${data.code})`);
      }
    }
  } catch (err) {
    console.warn("[Seed] Warning while ensuring default colleges:", err.message);
  }
};

module.exports = {
  seedDefaultColleges,
  DEFAULT_COLLEGES,
};
