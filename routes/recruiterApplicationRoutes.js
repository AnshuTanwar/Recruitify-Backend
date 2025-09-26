const express = require("express");
const router = express.Router();
const { protect } = require("../middlewares/authMiddleware");
const authorizeRoles = require("../middlewares/roleMiddleware");
const applicationRecruiterController = require("../controllers/applicationRecruiterController");

router.use(protect, authorizeRoles("Recruiter"));

router.get("/jobs/:jobId/applications", applicationRecruiterController.getJobApplications);
router.put("/applications/:applicationId/status", applicationRecruiterController.updateApplicationStatus);
router.get("/applications/:applicationId/resume-url", applicationRecruiterController.getApplicantResumeUrl);

module.exports = router;
