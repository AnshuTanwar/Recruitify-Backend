const express = require("express");
const router = express.Router();
const { protect } = require("../middlewares/authMiddleware");
const authorizeRoles = require("../middlewares/roleMiddleware");
const chatAssistantController = require("../controllers/chatAssistantController");

// recruiter gets AI-generated question suggestions
router.get(
    "/:applicationId/questions",
    protect,
    authorizeRoles("Recruiter"),
    chatAssistantController.getSuggestedQuestions
);

module.exports = router;
