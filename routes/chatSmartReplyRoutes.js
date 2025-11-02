const express = require("express");
const router = express.Router();
const { protect } = require("../middlewares/authMiddleware");
const authorizeRoles = require("../middlewares/roleMiddleware");
const chatSmartReplyController = require("../controllers/chatSmartReplyController");

// Candidate-only route
router.post(
    "/:messageId/smart-reply",
    protect,
    authorizeRoles("Candidate"),
    chatSmartReplyController.getSmartReplies
);

module.exports = router;
