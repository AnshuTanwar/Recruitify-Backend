const express = require("express");
const router = express.Router();
const { protect } = require("../middlewares/authMiddleware");
const authorizeRoles = require("../middlewares/roleMiddleware");
const { getAllReports, takeReportAction, getReportSummary } = require("../controllers/adminReportController");

// Admin-only access
router.use(protect, authorizeRoles("Admin"));

// GET all reports
router.get("/reports", getAllReports);

// PUT action on report (delete or ignore)
router.put("/reports/:id/action", takeReportAction);

router.get("/reports/summary", getReportSummary);
module.exports = router;
