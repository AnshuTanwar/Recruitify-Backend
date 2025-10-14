const express = require("express");
const router = express.Router();
const { protect } = require("../middlewares/authMiddleware");
const authorizeRoles = require("../middlewares/roleMiddleware");
const controller = require("../controllers/adminAnalyticsController");

router.use(protect, authorizeRoles("Admin"));

router.get("/analytics/summary", controller.getSummary);
router.get("/analytics/trends", controller.getTrends);

module.exports = router;
