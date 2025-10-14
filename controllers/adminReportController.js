const Report = require("../models/report");
const User = require("../models/User");
const Job = require("../models/job");
const { logAction } = require("../utils/analyticsLogger");

// GET /api/admin/reports?status=pending&page=1&limit=20
exports.getAllReports = async (req, res, next) => {
    try {
        const { status, page = 1, limit = 20 } = req.query;
        const filter = {};

        if (status) filter.status = status;

        const skip = (parseInt(page) - 1) * parseInt(limit);

        const [total, reports] = await Promise.all([
            Report.countDocuments(filter),
            Report.find(filter)
                .populate("reportedUser", "fullName email role")
                .populate("reporter", "fullName email role")
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(parseInt(limit)),
        ]);

        res.json({
            success: true,
            meta: { total, page: parseInt(page), limit: parseInt(limit) },
            data: reports,
        });
    } catch (err) {
        next(err);
    }
};

// PUT /api/admin/reports/:id/action
exports.takeReportAction = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { action } = req.body; // "delete" or "ignore"

        const report = await Report.findById(id).populate("reportedUser");
        if (!report) {
            const err = new Error("Report not found");
            err.statusCode = 404;
            return next(err);
        }

        const recruiter = report.reportedUser;
        if (!recruiter || recruiter.role !== "Recruiter") {
            const err = new Error("Reported user is not a recruiter");
            err.statusCode = 400;
            return next(err);
        }

        // 🔹 DELETE recruiter + related data
        if (action === "delete") {
            const recruiterId = recruiter._id;

            // Delete recruiter + jobs + all reports
            await Promise.all([
                User.findByIdAndDelete(recruiterId),
                Job.deleteMany({ recruiter: recruiterId }),
                Report.deleteMany({ reportedUser: recruiterId }),
            ]);

            // Log this admin action
            await logAction("admin_recruiter_deleted", req.user._id, {
                recruiterId,
                email: recruiter.email,
                fullName: recruiter.fullName,
            });

            return res.json({
                success: true,
                message: `Recruiter ${recruiter.fullName} deleted along with jobs and reports.`,
            });
        }

        // 🔹 IGNORE reports (mark reviewed)
        if (action === "ignore") {
            report.status = "reviewed";
            await report.save();

            await Report.deleteMany({ reportedUser: recruiter._id });

            // Log this admin action
            await logAction("admin_report_ignored", req.user._id, {
                recruiterId: recruiter._id,
                recruiterName: recruiter.fullName,
            });

            return res.json({
                success: true,
                message: "Reports marked as reviewed and cleared.",
            });
        }

        const err = new Error("Invalid action");
        err.statusCode = 400;
        next(err);
    } catch (err) {
        next(err);
    }
};

// GET /api/admin/reports/summary
exports.getReportSummary = async (req, res, next) => {
    try {
        const [pending, reviewed, actionTaken, total] = await Promise.all([
            Report.countDocuments({ status: "pending" }),
            Report.countDocuments({ status: "reviewed" }),
            Report.countDocuments({ status: "action_taken" }),
            Report.countDocuments(),
        ]);

        // Log dashboard view (optional)
        await logAction("admin_view_report_summary", req.user._id, {
            pending, reviewed, actionTaken, total,
        });

        res.json({
            success: true,
            summary: { pending, reviewed, actionTaken, total },
        });
    } catch (err) {
        next(err);
    }
};
