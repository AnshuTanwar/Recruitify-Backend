const Candidate = require("../models/candidate");
const User = require("../models/User");
const { uploadBufferToS3, deleteFromS3, getPresignedUrl } = require("../utils/s3Helper");

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
        const { key } = await uploadBufferToS3(
            req.file.buffer,
            req.file.mimetype,
            req.file.originalname,
            req.user._id
        );

        const resumeObj = {
            key,
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
        const { resumeKey } = req.params;
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

// GET /api/candidate/resumes/:resumeKey/url
exports.downloadResume = async (req, res, next) => {
    try {
        const candidate = await Candidate.findById(req.user._id);
        if (!candidate) {
            const err = new Error("Candidate not found");
            err.statusCode = 404;
            return next(err);
        }

        const { resumeKey } = req.params;
        const resume = (candidate.resumes || []).find(r => r.key === resumeKey);
        if (!resume) {
            const err = new Error("Resume not found");
            err.statusCode = 404;
            return next(err);
        }

        const url = await getPresignedUrl(resume.key, 900);
        res.json({ url, expiresIn: 900 });
    } catch (err) {
        next(err);
    }
};
