const Candidate = require("../models/candidate");
const { analyzeResumeWithGemini } = require("../utils/geminiHelper");
const { getFileBufferFromS3 } = require("../utils/s3Helper");
const { extractTextFromResume } = require("../utils/resumeParser");

// POST /api/candidate/resume/analyze
// Body: { jobTitle, jobDescription, resumeKey? (optional if using uploaded resume), newFile? }
exports.analyzeResume = async (req, res, next) => {
    try {
        const { jobTitle, jobDescription, resumeKey } = req.body;
        const candidateId = req.user._id;

        if (!jobTitle || !jobDescription) {
            const err = new Error("Job title and job description are required");
            err.statusCode = 400;
            return next(err);
        }

        let resumeText = "";

        // If user selected an existing uploaded resume
        if (resumeKey) {
            const buffer = await getFileBufferFromS3(resumeKey);
            resumeText = await extractTextFromResume(buffer, resumeKey);
        }
        // If user uploaded a new resume (multipart/form-data)
        else if (req.file) {
            resumeText = await extractTextFromResume(req.file.buffer, req.file.originalname);
        } else {
            const err = new Error("No resume provided");
            err.statusCode = 400;
            return next(err);
        }

        // analyze using Gemini
        const analysis = await analyzeResumeWithGemini({
            resumeText,
            jobTitle,
            jobDescription,
        });

        res.status(200).json({
            message: "Resume analysis completed",
            analysis,
        });
    } catch (err) {
        console.error("Resume analysis error:", err.message || err);
        next(err);
    }
};
