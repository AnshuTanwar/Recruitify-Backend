const express = require("express");
const router = express.Router();
const chatController = require("../controllers/chatController");
const { protect } = require("../middlewares/authMiddleware");
const authorizeRoles = require("../middlewares/roleMiddleware");

// recruiter initiates chat
router.post("/initiate", protect, authorizeRoles("Recruiter"), chatController.initiateChatRoom);

// common endpoints for both recruiter & candidate
router.post("/:roomId/message", protect, chatController.createMessage);
router.put("/:roomId/seen", protect, chatController.markAsSeen);
router.get("/:roomId/messages", protect, chatController.getMessages);
router.delete("/:roomId", protect, chatController.closeChat);

module.exports = router;
