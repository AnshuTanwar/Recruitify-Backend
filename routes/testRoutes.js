const express = require("express");
const { redisClient } = require("../config/redis");
const JobApplication = require("../models/jobApplication");
const atsQueue = require("../jobs/atsQueue");
const { computeATSScoreV2 } = require("../utils/atsScorerV2");

const router = express.Router();

// GET /api/test-redis
router.get("/test-redis", async (req, res) => {
    try {
        await redisClient.set("foo", "bar", { EX: 60 });
        const result = await redisClient.get("foo");
        res.json({
            success: true,
            message: "Redis is working 🚀",
            storedValue: result,
        });
    } catch (err) {
        console.error("Redis Test Error:", err);
        res.status(500).json({ success: false, error: err.message });
    }
});

// GET /api/test-ats-scores - Check applications and their ATS scores
router.get("/test-ats-scores", async (req, res) => {
    try {
        const applications = await JobApplication.find({})
            .populate("candidate", "fullName email")
            .populate("job", "jobName skillsRequired")
            .limit(10);
        
        const result = applications.map(app => ({
            id: app._id,
            candidate: app.candidate?.fullName || "Unknown",
            job: app.job?.jobName || "Unknown Job",
            atsScore: app.atsScore,
            hasResume: !!app.resume?.key,
            createdAt: app.createdAt
        }));
        
        res.json({
            success: true,
            totalApplications: applications.length,
            applications: result
        });
    } catch (err) {
        console.error("ATS Test Error:", err);
        res.status(500).json({ success: false, error: err.message });
    }
});

// POST /api/test-ats-manual - Manually calculate ATS scores for applications without scores
router.post("/test-ats-manual", async (req, res) => {
    try {
        const applications = await JobApplication.find({ 
            atsScore: { $in: [null, undefined] },
            resume: { $exists: true }
        })
        .populate("job", "skillsRequired")
        .limit(5);
        
        if (applications.length === 0) {
            return res.json({
                success: true,
                message: "No applications found without ATS scores",
                updated: 0
            });
        }
        
        let updated = 0;
        for (const app of applications) {
            try {
                // Generate a sample ATS score based on job skills
                const jobSkills = app.job?.skillsRequired || [];
                
                // For testing, create a mock resume text with some skills
                const mockResumeText = `
                    Software Developer with experience in ${jobSkills.slice(0, 3).join(", ")}.
                    Skilled in programming and development.
                    Experience: 3 years of experience in software development.
                    Education: Bachelor's degree in Computer Science.
                `;
                
                const atsScore = computeATSScoreV2(mockResumeText, jobSkills);
                
                await JobApplication.findByIdAndUpdate(app._id, {
                    atsScore: atsScore,
                    resumeSnapshot: mockResumeText.slice(0, 500)
                });
                
                updated++;
                console.log(`Updated application ${app._id} with ATS score: ${atsScore}`);
            } catch (err) {
                console.error(`Error updating application ${app._id}:`, err);
            }
        }
        
        res.json({
            success: true,
            message: `Updated ${updated} applications with ATS scores`,
            updated: updated
        });
    } catch (err) {
        console.error("Manual ATS Error:", err);
        res.status(500).json({ success: false, error: err.message });
    }
});

module.exports = router;
