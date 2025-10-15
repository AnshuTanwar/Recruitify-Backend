const Job = require("../models/job");
const JobApplication = require("../models/jobApplication");
const { getPresignedUrl } = require("../utils/s3Helper");

// GET /api/recruiter/jobs/:jobId/applications?page=1&limit=20
exports.getJobApplications = async (req, res, next) => {
    try {
        const recruiterId = req.user._id;
        const { jobId } = req.params; // optional, for single job
        const page = Math.max(parseInt(req.query.page || "1", 10), 1);
        const limit = Math.min(parseInt(req.query.limit || "20", 10), 100);
        const skip = (page - 1) * limit;
        const sortParam = req.query.sort;
        let sort = { createdAt: -1 }; // default sort: latest

        if (sortParam === "ats") {
            sort = { atsScore: -1 };
        } else if (sortParam === "oldest") {
            sort = { createdAt: 1 };
        }

        let jobIds = [];

        if (jobId) {
            // Single job requested, verify ownership
            const job = await Job.findById(jobId);
            if (!job || job.recruiter.toString() !== recruiterId.toString()) {
                const err = new Error("Job not found or unauthorized");
                err.statusCode = 404;
                return next(err);
            }
            jobIds = [jobId];
        } else {
            // No jobId, get all jobs for recruiter
            const jobs = await Job.find({ recruiter: recruiterId }).select("_id");
            jobIds = jobs.map(j => j._id);
            if (!jobIds.length) {
                // No jobs for recruiter, return empty result with pagination meta
                return res.json({ total: 0, page, limit, applications: [] });
            }
        }

        // Build filter
        let filter = { job: { $in: jobIds } };

        // Filter by jobId if query param overrides (for all jobs case)
        if (!jobId && req.query.jobId) {
            if (jobIds.includes(req.query.jobId)) {
                filter.job = req.query.jobId;
            } else {
                // If jobId query param not owned by recruiter, return empty result
                return res.json({ total: 0, page, limit, applications: [] });
            }
        }

        // Status filtering
        if (req.query.status === "pending") {
            filter.atsScore = null;
        } else if (req.query.status === "scored") {
            filter.atsScore = { $ne: null };
        } else if (req.query.status) {
            // Generic status filter for values like shortlisted/rejected/pending etc.
            filter.status = req.query.status;
        }

        // Count total matching documents for pagination
        const total = await JobApplication.countDocuments(filter);

        // Fetch applications with pagination and sorting
        const applications = await JobApplication.find(filter)
            .populate({
                path: "candidate",
                select: "fullName email location skills resumes"
            })
            .populate({
                path: "job",
                select: "jobName skillsRequired"
            })
            .sort(sort)
            .skip(skip)
            .limit(limit);

        // Add atsStatus field
        const applicationsWithStatus = applications.map(app => ({
            ...app.toObject(),
            atsStatus: app.atsScore !== null ? "scored" : "pending"
        }));

        res.json({ total, page, limit, applications: applicationsWithStatus });
    } catch (err) {
        next(err);
    }
};




// PUT /api/recruiter/applications/:applicationId/status
exports.updateApplicationStatus = async (req, res, next) => {
    try {
        const { applicationId } = req.params;
        const { status, recruiterNotes } = req.body;
        const recruiterId = req.user._id;

        const app = await JobApplication.findById(applicationId).populate("job");
        if (!app || app.job.recruiter.toString() !== recruiterId.toString()) {
            const err = new Error("Application not found or unauthorized");
            err.statusCode = 404;
            return next(err);
        }

        if (status) app.status = status;
        if (recruiterNotes !== undefined) app.recruiterNotes = recruiterNotes;

        await app.save();

        res.json({ message: "Application updated", application: app });
    } catch (err) {
        next(err);
    }
};

// GET /api/recruiter/applications/:applicationId/resume-url
// returns presigned URL to download applicant resume
exports.getApplicantResumeUrl = async (req, res, next) => {
    try {
        const { applicationId } = req.params;
        const recruiterId = req.user._id;

        const app = await JobApplication.findById(applicationId).populate("job");
        if (!app || app.job.recruiter.toString() !== recruiterId.toString()) {
            const err = new Error("Application not found or unauthorized");
            err.statusCode = 404;
            return next(err);
        }

        if (!app.resume || !app.resume.key) {
            const err = new Error("Resume not available");
            err.statusCode = 404;
            return next(err);
        }

        const presigned = await getPresignedUrl(app.resume.key, 900); // 15 minutes
        res.json({ url: presigned, expiresIn: 900 });
    } catch (err) {
        next(err);
    }
};
