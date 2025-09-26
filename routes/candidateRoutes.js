const express = require("express");
const router = express.Router();
const candidateController = require("../controllers/candidateController");
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

//feed
router.get("/feed", candidateController.getCandidateJobs);

module.exports = router;
