const express = require("express");
const { protect } = require("../middlewares/authMiddleware");
const authorizeRoles = require("../middlewares/roleMiddleware");
const recruiterJobController = require("../controllers/recruiterJobController");
const recruiterApplicationController = require("../controllers/recruiterApplicationController")

const router = express.Router();

// All recruiter job routes are protected + recruiter only
router.use(protect, authorizeRoles("Recruiter"));

// Recruiter-only routes
router.post("/", recruiterJobController.createJob);
router.get("/", recruiterJobController.getRecruiterJobs);
router.put("/:id", recruiterJobController.updateJob);
router.delete("/:id", recruiterJobController.deleteJob);
router.get("/:id/applications", recruiterJobController.getJobApplications);

router.get("/applications", recruiterApplicationController.getApplications);

module.exports = router;
