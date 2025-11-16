const express = require("express");
const router = express.Router();
const interviewController = require("../controllers/interviewController");
const { protect } = require("../middlewares/authMiddleware");
const authorizeRoles = require("../middlewares/roleMiddleware");

// protect routes - only candidate can do voice interview
router.use(protect, authorizeRoles("Candidate"));

router.post("/start", interviewController.startInterview);
router.post("/answer", interviewController.analyzeAnswer);
router.post("/end", interviewController.endInterview);

router.get("/my", interviewController.getMySessions);
router.get("/:sessionId", interviewController.getSessionById);

module.exports = router;
