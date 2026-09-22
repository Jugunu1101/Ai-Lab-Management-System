const College = require("./college.model");

const getPublicColleges = async () => {
  const colleges = await College.find({ status: "ACTIVE" })
    .select("_id name code domains departments website")
    .sort({ name: 1 });
  return colleges;
};

const getCollegeById = async (id) => {
  const college = await College.findById(id).populate("adminId", "name email");
  if (!college) {
    const error = new Error("College not found");
    error.statusCode = 404;
    error.code = "COLLEGE_NOT_FOUND";
    throw error;
  }
  return college;
};

const createCollege = async (data) => {
  const existing = await College.findOne({ code: data.code.toUpperCase() });
  if (existing) {
    const error = new Error("College with this code already exists");
    error.statusCode = 409;
    error.code = "COLLEGE_EXISTS";
    throw error;
  }

  const college = await College.create({
    name: data.name,
    code: data.code.toUpperCase(),
    domains: data.domains || [],
    departments: data.departments || [],
    adminId: data.adminId,
    website: data.website,
    address: data.address,
  });

  return college;
};

const updateCollegeDomains = async (collegeId, domains) => {
  const college = await College.findById(collegeId);
  if (!college) {
    const error = new Error("College not found");
    error.statusCode = 404;
    error.code = "COLLEGE_NOT_FOUND";
    throw error;
  }

  college.domains = domains.map((d) => d.toLowerCase().trim());
  await college.save();
  return college;
};

module.exports = {
  getPublicColleges,
  getCollegeById,
  createCollege,
  updateCollegeDomains,
};
