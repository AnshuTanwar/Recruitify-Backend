const Job = require("../models/job");
const Candidate = require("../models/candidate");
const JobApplication = require("../models/jobApplication");

// POST /api/recruiter/jobs
exports.createJob = async (req, res, next) => {
    try {
        const recruiterId = req.user._id; // recruiter authenticated

        const {
            jobName,
            description,
            skillsRequired,
            experienceRequired,
            salary,
            type,
        } = req.body;

        const job = await Job.create({
            recruiter: recruiterId,
            jobName,
            description,
            skillsRequired,
            experienceRequired,
            salary,
            type,
        });

        res.status(201).json(job);
    } catch (err) {
        next(err);
    }
};

// GET /api/recruiter/jobs
exports.getRecruiterJobs = async (req, res, next) => {
    try {
        const recruiterId = req.user._id;
        const jobs = await Job.find({ recruiter: recruiterId }).sort("-createdAt");
        res.json(jobs);
    } catch (err) {
        next(err);
    }
};

// PUT /api/recruiter/jobs/:id
exports.updateJob = async (req, res, next) => {
    try {
        const recruiterId = req.user._id;
        const jobId = req.params.id;

        const job = await Job.findOneAndUpdate(
            { _id: jobId, recruiter: recruiterId },
            req.body,
            { new: true }
        );

        if (!job) {
            const error = new Error("Job not found or unauthorized");
            error.statusCode = 404;
            return next(error);
        }

        res.json(job);
    } catch (err) {
        next(err);
    }
};

// DELETE /api/recruiter/jobs/:id
exports.deleteJob = async (req, res, next) => {
    try {
        const recruiterId = req.user._id;
        const jobId = req.params.id;

        const job = await Job.findOneAndDelete({ _id: jobId, recruiter: recruiterId });

        if (!job) {
            const error = new Error("Job not found or unauthorized");
            error.statusCode = 404;
            return next(error);
        }

        res.json({ message: "Job deleted successfully" });
    } catch (err) {
        next(err);
    }
};

exports.getJobApplications = async (req, res, next) => {
    try {
        const { jobId } = req.params;

        const job = await Job.findOne({ _id: jobId, recruiter: req.user._id });
        if (!job) {
            const err = new Error("Job not found or unauthorized");
            err.statusCode = 404;
            return next(err);
        }

        const applications = await JobApplication.find({ job: jobId })
            .populate("candidate", "fullName skills")
            .sort({ atsScore: -1, createdAt: -1 }); // sort by ATS score desc

        res.json({ count: applications.length, applications });
    } catch (err) {
        next(err);
    }
};
