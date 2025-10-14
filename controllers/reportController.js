const Report = require("../models/report");
const Recruiter = require("../models/recruiter");
const User = require("../models/User");
const Job = require("../models/job");

// POST /api/candidate/report/:recruiterId
exports.reportRecruiter = async (req, res, next) => {
    try {
        const candidateId = req.user._id;
        const { recruiterId } = req.params;
        const { reason } = req.body;

        // prevent self-reporting
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

        // create new report
        const report = await Report.create({
            reportedUser: recruiterId,
            reporter: candidateId,
            reason: reason || "No reason provided",
        });

        // count total reports against this recruiter
        const totalReports = await Report.countDocuments({ reportedUser: recruiterId });

        // AUTO-BAN if recruiter reaches 50 reports
        if (totalReports >= 50) {
            console.log(` Recruiter ${recruiterId} reached ${totalReports} reports — auto-banning.`);

            await Promise.all([
                User.findByIdAndDelete(recruiterId),
                Job.deleteMany({ recruiter: recruiterId }),
                Report.deleteMany({ reportedUser: recruiterId }),
            ]);

            return res.status(200).json({
                message: `Recruiter auto-banned and removed from system after ${totalReports} reports.`,
                autoBanned: true,
            });
        }

        // otherwise, normal success response
        res.status(201).json({
            message: "Recruiter reported successfully. Admin will review soon.",
            report,
            totalReports,
        });
    } catch (err) {
        next(err);
    }
};
