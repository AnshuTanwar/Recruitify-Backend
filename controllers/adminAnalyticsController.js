const AnalyticsLog = require("../models/analyticsLog");
const User = require("../models/User");
const Job = require("../models/job");
const Report = require("../models/report");

exports.getSummary = async (req, res, next) => {
    try {
        // total counts
        const [candidates, recruiters, jobs, reports] = await Promise.all([
            User.countDocuments({ role: "Candidate" }),
            User.countDocuments({ role: "Recruiter" }),
            Job.countDocuments(),
            require("../models/report").countDocuments(),
        ]);

        // activity timeline (last 10 logs)
        const recent = await AnalyticsLog.find({})
            .populate("user", "fullName email role")
            .sort({ createdAt: -1 })
            .limit(10);

        res.json({
            totals: { candidates, recruiters, jobs, reports },
            recent,
        });
    } catch (err) {
        next(err);
    }
};

// optional: grouped analytics (last 7 days)
exports.getTrends = async (req, res, next) => {
    try {
        const since = new Date();
        since.setDate(since.getDate() - 7);

        const pipeline = [
            { $match: { createdAt: { $gte: since } } },
            { $group: { _id: "$action", count: { $sum: 1 } } },
            { $sort: { count: -1 } },
        ];

        const trendData = await AnalyticsLog.aggregate(pipeline);
        res.json(trendData);
    } catch (err) {
        next(err);
    }
};

// GET /api/admin/analytics/overview
exports.getOverview = async (req, res, next) => {
    try {
        const [recruiters, candidates, jobs, reports] = await Promise.all([
            User.countDocuments({ role: "Recruiter" }),
            User.countDocuments({ role: "Candidate" }),
            Job.countDocuments(),
            Report.countDocuments(),
        ]);

        res.json({
            summary: {
                totalRecruiters: recruiters,
                totalCandidates: candidates,
                totalJobs: jobs,
                totalReports: reports,
            },
        });
    } catch (err) {
        next(err);
    }
};

// GET /api/admin/analytics/recent-actions?page=1&limit=10
exports.getRecentActions = async (req, res, next) => {
    try {
        const page = parseInt(req.query.page || "1");
        const limit = parseInt(req.query.limit || "10");
        const skip = (page - 1) * limit;

        const [total, logs] = await Promise.all([
            AnalyticsLog.countDocuments(),
            AnalyticsLog.find()
                .populate("user", "fullName email role")
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit),
        ]);

        res.json({
            total,
            page,
            limit,
            logs,
        });
    } catch (err) {
        next(err);
    }
};