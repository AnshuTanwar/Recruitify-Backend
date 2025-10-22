const express = require("express");
const router = express.Router();
const multer = require("multer");
const upload = multer();
const { protect } = require("../middlewares/authMiddleware");
const authorizeRoles = require("../middlewares/roleMiddleware");
const { analyzeResume } = require("../controllers/resumeAnalyzerController");

// Candidate can analyze resume (via uploaded file or existing resumeKey)
router.post(
    "/analyze",
    protect,
    authorizeRoles("Candidate"),
    upload.single("newFile"),
    analyzeResume
);

module.exports = router;
