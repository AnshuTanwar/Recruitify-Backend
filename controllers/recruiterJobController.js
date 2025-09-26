const Job = require("../models/job");
const Candidate = require("../models/candidate");

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