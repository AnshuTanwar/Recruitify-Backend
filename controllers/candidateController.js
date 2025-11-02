const Candidate = require("../models/candidate");
const User = require("../models/User");
const { uploadBufferToS3, deleteFromS3, getPresignedUrl } = require("../utils/s3Helper");
const JobApplication = require("../models/jobApplication");
const Job = require("../models/job");
const atsQueue = require("../jobs/atsQueue");

// GET /api/candidate/profile
exports.getProfile = async (req, res, next) => {
    try {
        const candidate = await Candidate.findById(req.user._id).select("-password");
        if (!candidate) {
            const err = new Error("Candidate profile not found");
            err.statusCode = 404;
            return next(err);
        }
        res.json(candidate);
    } catch (err) {
        next(err);
    }
};

// PUT /api/candidate/profile
exports.updateProfile = async (req, res, next) => {
    try {
        const updates = {};
        // allow updating some fields only
        const allowed = ["fullName", "location", "bio", "phone", "experience", "skills"];
        allowed.forEach(field => {
            if (req.body[field] !== undefined) updates[field] = req.body[field];
        });

        // If fullName update, save on User base too
        if (updates.fullName) {
            await User.findByIdAndUpdate(req.user._id, { fullName: updates.fullName });
            delete updates.fullName;
        }

        const candidate = await Candidate.findByIdAndUpdate(req.user._id, updates, { new: true }).select("-password");
        res.json(candidate);
    } catch (err) {
        next(err);
    }
};

// POST /api/candidate/resumes  (single file field 'resume')
exports.uploadResume = async (req, res, next) => {
    try {
        if (!req.file) {
            const error = new Error("No file provided");
            error.statusCode = 400;
            return next(error);
        }

        const candidate = await Candidate.findById(req.user._id);
        if (!candidate) {
            const error = new Error("Candidate not found");
            error.statusCode = 404;
            return next(error);
        }

        if (candidate.resumes && candidate.resumes.length >= 3) {
            const error = new Error("Maximum 3 resumes allowed");
            error.statusCode = 400;
            return next(error);
        }

        // upload to s3
        const { key, url } = await uploadBufferToS3(
            req.file.buffer,
            req.file.mimetype,
            req.file.originalname,
            req.user._id
        );

        const resumeObj = {
            key,
            url,
            originalName: req.file.originalname,
            uploadedAt: new Date()
        };

        candidate.resumes = candidate.resumes || [];
        candidate.resumes.push(resumeObj);
        await candidate.save();

        res.status(201).json({ message: "Resume uploaded", resume: resumeObj });
    } catch (err) {
        next(err);
    }
};

// DELETE /api/candidate/resumes/:resumeKey  (resumeKey = key or id — we'll use key)
exports.deleteResume = async (req, res, next) => {
    try {
        const resumeKey = decodeURIComponent(req.params.resumeKey);
        const candidate = await Candidate.findById(req.user._id);
        if (!candidate) {
            const error = new Error("Candidate not found");
            error.statusCode = 404;
            return next(error);
        }

        const idx = candidate.resumes.findIndex(r => r.key === resumeKey);
        if (idx === -1) {
            const error = new Error("Resume not found");
            error.statusCode = 404;
            return next(error);
        }

        const [removed] = candidate.resumes.splice(idx, 1);
        await candidate.save();

        // delete from S3
        await deleteFromS3(removed.key);

        res.json({ message: "Resume deleted" });
    } catch (err) {
        next(err);
    }
};

// GET /api/candidate/resumes/:resumeKey/url
exports.getResumeUrl = async (req, res, next) => {
    try {
        const candidate = await Candidate.findById(req.user._id);
        if (!candidate) {
            const err = new Error("Candidate not found");
            err.statusCode = 404;
            return next(err);
        }

        const resumeKey = decodeURIComponent(req.params.resumeKey);

        // find resume
        const resume = (candidate.resumes || []).find(r => r.key === resumeKey);
        if (!resume) {
            const err = new Error("Resume not found in your profile");
            err.statusCode = 404;
            return next(err);
        }

        // generate presigned URL (valid 10 minutes)
        const presignedUrl = await getPresignedUrl(resume.key, 600);

        res.json({
            url: presignedUrl,
            expiresIn: 600,
            originalName: resume.originalName
        });
    } catch (err) {
        next(err);
    }
};

// Candidate Job Feed (for matching)
exports.getCandidateJobs = async (req, res, next) => {
    try {
        const candidate = await Candidate.findById(req.user._id).select("skills");
        if (!candidate) {
            const error = new Error("Candidate not found");
            error.statusCode = 404;
            return next(error);
        }

        const jobs = await Job.find({
            skillsRequired: { $in: candidate.skills },
            status: "open",
        }).sort("-createdAt");

        res.json(jobs);
    } catch (err) {
        next(err);
    }
};

// GET /api/candidate/jobs/:jobId
exports.getJobDetails = async (req, res, next) => {
    try {
        const { jobId } = req.params;

        // find job and recruiter details
        const job = await Job.findById(jobId).populate(
            "recruiter",
            "fullName company email location about"
        );

        if (!job || job.status !== "open") {
            const err = new Error("Job not found or no longer open");
            err.statusCode = 404;
            return next(err);
        }

        res.json({
            job: {
                id: job._id,
                jobName: job.jobName,
                companyName: job.companyName,
                location: job.location,
                type: job.type,
                description: job.description,
                skillsRequired: job.skillsRequired,
                requirements: job.requirements,
                benefits: job.benefits,
                experienceLevel: job.experienceLevel,
                education: job.education,
                applicationDeadline: job.applicationDeadline,
                salary: {
                    min: job.salary?.min,
                    max: job.salary?.max,
                    period: job.salary?.period,
                    currency: job.salary?.currency,
                },
                status: job.status,
                createdAt: job.createdAt,
                updatedAt: job.updatedAt,
                recruiter: job.recruiter
                    ?   {
                            id: job.recruiter._id,
                            name: job.recruiter.fullName,
                            company: job.recruiter.company,
                            email: job.recruiter.email,
                            location: job.recruiter.location || null,
                            about: job.recruiter.about || null,
                        }
                    : null,
            },
        });
    } catch (err) {
        next(err);
    }
};


// GET /api/candidate/jobs/:jobId/status
exports.getJobApplicationStatus = async (req, res, next) => {
    try {
        const { jobId } = req.params;
        const candidateId = req.user._id;

        // Check if job exists and open
        const job = await Job.findById(jobId).select("status");
        if (!job || job.status !== "open") {
            const err = new Error("Job not found or closed");
            err.statusCode = 404;
            return next(err);
        }

        // Check if candidate has already applied
        const existingApplication = await JobApplication.findOne({
            job: jobId,
            candidate: candidateId,
        }).select("_id status atsScore createdAt");

        res.json({
            jobId,
            hasApplied: !!existingApplication,
            application: existingApplication
            ? {
                id: existingApplication._id,
                status: existingApplication.status,
                atsScore: existingApplication.atsScore,
                appliedAt: existingApplication.createdAt,
            }
            : null,
        });
    } catch (err) {
        next(err);
    }
};

// GET /api/candidate/resumeslist
// returns list of candidate's uploaded resumes
exports.getCandidateResumes = async (req, res, next) => {
    try {
        const candidateId = req.user._id;
        const candidate = await Candidate.findById(candidateId).select("resumes");

        if (!candidate) {
            const err = new Error("Candidate not found");
            err.statusCode = 404;
            return next(err);
        }

        res.json({
            total: candidate.resumes?.length || 0,
            resumes: candidate.resumes || [],
        });
    } catch (err) {
        next(err);
    }
};
