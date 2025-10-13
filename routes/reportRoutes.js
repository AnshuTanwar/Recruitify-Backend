const express = require("express");
const { protect } = require("../middlewares/authMiddleware");
const authorizeRoles = require("../middlewares/roleMiddleware");
const { reportRecruiter } = require("../controllers/reportController");

const router = express.Router();

router.use(protect, authorizeRoles("Candidate"));

// Only candidates can report recruiters
router.post("/report/:recruiterId", reportRecruiter);

module.exports = router;
