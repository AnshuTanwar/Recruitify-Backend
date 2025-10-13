const mongoose = require("mongoose");
const Job = require("../models/job");
const Candidate = require("../models/candidate");
const JobApplication = require("../models/jobApplication");
const sendEmail = require("../utils/sendEmail");
const atsQueue = require("../jobs/atsQueue");

// POST /api/candidate/jobs/:jobId/apply
exports.applyToJob = async (req, res, next) => {
    const session = await mongoose.startSession();
    session.startTransaction();
    try {
        const candidateId = req.user._id;
        const { jobId } = req.params;
        const { resumeKey } = req.body;

        const job = await Job.findById(jobId).session(session);
        if (!job || job.status !== "open") {
            const err = new Error("Job not found or not accepting applications");
            err.statusCode = 404;
            await session.abortTransaction();
            session.endSession();
            return next(err);
        }

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

        const existing = await JobApplication.findOne({ candidate: candidateId, job: jobId }).session(session);
        if (existing) {
            const err = new Error("You have already applied to this job");
            err.statusCode = 400;
            await session.abortTransaction();
            session.endSession();
            return next(err);
        }

        // create application with ATS pending
        const [application] = await JobApplication.create(
            [
                {
                    candidate: candidateId,
                    job: jobId,
                    resume: {
                        key: resumeMeta.key,
                        originalName: resumeMeta.originalName,
                    },
                    atsScore: null, // initially null
                },
            ],
            { session }
        );

        // candidate.appliedJobs update
        candidate.appliedJobs = candidate.appliedJobs || [];
        candidate.appliedJobs.push(jobId);
        await candidate.save({ session });

        await session.commitTransaction();
        session.endSession();

        // 🔥 Push ATS scoring to background queue
        await atsQueue.add({
            applicationId: application._id,
            resumeKey: resumeMeta.key,
            originalName: resumeMeta.originalName,
            jobSkills: job.skillsRequired || [],
        });

        // optional recruiter notification
        (async () => {
            try {
                const recruiter = job.recruiter;
                const recruiterDoc = await require("../models/recruiter").findById(recruiter).select("email company");
                if (recruiterDoc?.email) {
                    await sendEmail({
                        to: recruiterDoc.email,
                        subject: `New application for ${job.jobName}`,
                        text: `${candidate.fullName} has applied for ${job.jobName}.`
                    });
                }
            } catch (e) {
                console.error("Notification error:", e.message || e);
            }
        })();

        res.status(201).json({
            message: "Applied successfully",
            applicationId: application._id,
            atsStatus: "processing",
        });
    } catch (err) {
        await session.abortTransaction();
        session.endSession();
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