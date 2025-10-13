const Report = require("../models/report");
const Recruiter = require("../models/recruiter");
const User = require("../models/User");

// POST /api/candidate/report/:recruiterId
exports.reportRecruiter = async (req, res, next) => {
    try {
        const candidateId = req.user._id;
        const { recruiterId } = req.params;
        const { reason } = req.body;

        // ensure candidate is not reporting self
        if (candidateId.toString() === recruiterId.toString()) {
            const err = new Error("You cannot report yourself.");
            err.statusCode = 400;
            return next(err);
        }

        // check if recruiter exists
        const recruiter = await Recruiter.findById(recruiterId);
        if (!recruiter) {
            const err = new Error("Recruiter not found");
            err.statusCode = 404;
            return next(err);
        }

        // check if already reported
        const existingReport = await Report.findOne({
            reporter: candidateId,
            reportedUser: recruiterId,
            status: "pending",
        });

        if (existingReport) {
            const err = new Error("You have already reported this recruiter. Await admin review.");
            err.statusCode = 400;
            return next(err);
        }

        // create report
        const report = await Report.create({
            reportedUser: recruiterId,
            reporter: candidateId,
            reason: reason || "No reason provided",
        });

        res.status(201).json({
            message: "Recruiter reported successfully. Admin will review soon.",
            report,
        });
    } catch (err) {
        next(err);
    }
};
