const AnalyticsLog = require("../models/analyticsLog");
const User = require("../models/User");
const Job = require("../models/job");

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
