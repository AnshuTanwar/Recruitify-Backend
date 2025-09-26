const express = require("express");
const router = express.Router();
const recruiterController = require("../controllers/recruiterController");
const { protect } = require("../middlewares/authMiddleware");
const authorizeRoles = require("../middlewares/roleMiddleware");

// All routes protected + recruiter-only
router.use(protect, authorizeRoles("Recruiter"));

router.get("/profile", recruiterController.getProfile);
router.put("/profile", recruiterController.updateProfile);

module.exports = router;
