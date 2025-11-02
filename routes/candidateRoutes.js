const express = require("express");
const router = express.Router();
const candidateController = require("../controllers/candidateController");
const applicationCandidateController = require("../controllers/applicationCandidateController");
const { protect } = require("../middlewares/authMiddleware");
const authorizeRoles = require("../middlewares/roleMiddleware");
const upload = require("../middlewares/upload");

// protect + only Candidate role
router.use(protect, authorizeRoles("Candidate"));

router.get("/profile", candidateController.getProfile);
router.put("/profile", candidateController.updateProfile);

// resume upload (single file field name "resume")
router.post("/resumes", upload.single("resume"), candidateController.uploadResume);
router.delete("/resumes/:resumeKey", candidateController.deleteResume);
router.get("/resumes/:resumeKey/url", candidateController.getResumeUrl);
router.get("/resumeslist", candidateController.getCandidateResumes);

//feed
router.get("/feed", candidateController.getCandidateJobs);

// Candidate-only middlewares already used for this router
router.post("/jobs/:jobId/apply", applicationCandidateController.applyToJob);
router.get("/applications", applicationCandidateController.getCandidateApplications);
router.get("/jobs/:jobId", candidateController.getJobDetails);
router.get("/jobs/:jobId/status", candidateController.getJobApplicationStatus);


module.exports = router;
