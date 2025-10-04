const mongoose = require("mongoose");
const Job = require("../models/job");
const Candidate = require("../models/candidate");
const JobApplication = require("../models/JobApplication");
const { getFileBufferFromS3 } = require("../utils/s3Helper");
const { extractTextFromResume } = require("../utils/resumeParser");
const { computeATSScore } = require("../utils/atsScorer");
const sendEmail = require("../utils/sendEmail");

// POST /api/candidate/jobs/:jobId/apply
exports.applyToJob = async (req, res, next) => {
    const session = await mongoose.startSession();
    session.startTransaction();
    try {
        const candidateId = req.user._id;
        const { jobId } = req.params;
        const { resumeKey, coverLetter } = req.body;

        const job = await Job.findById(jobId).session(session);
        if (!job || job.status !== "open") {
            const err = new Error("Job not found or not accepting applications");
            err.statusCode = 404;
            await session.abortTransaction();
            session.endSession();
            return next(err);
        }

        // ensure candidate exists & has the chosen resume
        const candidate = await Candidate.findById(candidateId).session(session);
        if (!candidate) {
            const err = new Error("Candidate not found");
            err.statusCode = 404;
            await session.abortTransaction();
            session.endSession();
            return next(err);
        }

        if (!resumeKey) {
            const err = new Error("resumeKey is required (choose one of your uploaded resumes)");
            err.statusCode = 400;
            await session.abortTransaction();
            session.endSession();
            return next(err);
        }

        const resumeMeta = (candidate.resumes || []).find((r) => r.key === resumeKey);
        if (!resumeMeta) {
            const err = new Error("Selected resume not found in profile");
            err.statusCode = 400;
            await session.abortTransaction();
            session.endSession();
            return next(err);
        }

        // check if already applied
        const existing = await JobApplication.findOne({ candidate: candidateId, job: jobId }).session(session);
        if (existing) {
            const err = new Error("You have already applied to this job");
            err.statusCode = 400;
            await session.abortTransaction();
            session.endSession();
            return next(err);
        }

        // download resume from S3
        const buffer = await getFileBufferFromS3(resumeMeta.key);

        // parse resume text
        const resumeText = await extractTextFromResume(buffer, resumeMeta.originalName || "");

        // compute ATS score (job.skillsRequired expected array)
        const atsScore = computeATSScore(resumeText, job.skillsRequired || []);

        // create application
        const [application] = await JobApplication.create(
            [
                {
                    candidate: candidateId,
                    job: jobId,
                    coverLetter: coverLetter || "",
                    resume: {
                        key: resumeMeta.key,
                        originalName: resumeMeta.originalName,
                    },
                    resumeSnapshot: resumeText,
                    atsScore,
                },
            ],
            { session }
        );

        // push job to candidate.appliedJobs (if you maintain this)
        candidate.appliedJobs = candidate.appliedJobs || [];
        candidate.appliedJobs.push(jobId);
        await candidate.save({ session });

        await session.commitTransaction();
        session.endSession();

        // Optionally notify recruiter
        (async () => {
            try {
                const recruiter = job.recruiter;
                // populate recruiter email
                const recruiterDoc = await require("../models/recruiter").findById(recruiter).select("email company");
                if (recruiterDoc && recruiterDoc.email) {
                    await sendEmail({
                        to: recruiterDoc.email,
                        subject: `New application for ${job.jobName}`,
                        text: `${candidate.fullName} has applied for ${job.jobName}.`
                    });
                }
            } catch (e) {
                // swallow notification errors
                console.error("Notification error:", e.message || e);
            }
        })();

        // return created application (first element)
        res.status(201).json({ message: "Applied successfully", application: application[0] });
    } catch (err) {
        await session.abortTransaction();
        session.endSession();
        // if duplicate key error (unique index), provide nice message
        if (err.code === 11000) {
            err = new Error("You have already applied to this job");
            err.statusCode = 400;
        }
        next(err);
    }
};

// GET /api/candidate/applications
exports.getCandidateApplications = async (req, res, next) => {
    try {
        const candidateId = req.user._id;
        const apps = await JobApplication.find({ candidate: candidateId })
        .populate({
            path: "job",
            select: "jobName skillsRequired experienceRequired salary recruiter status"
        })
        .sort("-createdAt");
        res.json(apps);
    } catch (err) {
        next(err);
    }
};