const Job = require("../models/job");
const JobApplication = require("../models/jobApplication");
const { getPresignedUrl } = require("../utils/s3Helper");

// GET /api/recruiter/jobs/:jobId/applications?page=1&limit=20
exports.getJobApplications = async (req, res, next) => {
    try {
        const { jobId } = req.params;
        const recruiterId = req.user._id;

        const job = await Job.findById(jobId);
        if (!job || job.recruiter.toString() !== recruiterId.toString()) {
            const err = new Error("Job not found or unauthorized");
            err.statusCode = 404;
            return next(err);
        }

        const page = Math.max(parseInt(req.query.page || "1", 10), 1);
        const limit = Math.min(parseInt(req.query.limit || "20", 10), 100);
        const skip = (page - 1) * limit;

        const sortParam = req.query.sort === "ats" ? { atsScore: -1 } : { createdAt: -1 };

        // --- filter logic ---
        let filter = { job: jobId };
        if (req.query.status === "pending") {
            filter.atsScore = null;
        } else if (req.query.status === "scored") {
            filter.atsScore = { $ne: null };
        }

        const [total, applications] = await Promise.all([
            JobApplication.countDocuments(filter),
            JobApplication.find(filter)
                .populate({ path: "candidate", select: "fullName email location skills resumes" })
                .sort(sortParam)
                .skip(skip)
                .limit(limit)
        ]);

        // add atsStatus field
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
