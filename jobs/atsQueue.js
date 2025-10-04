const Queue = require("bull");
const { redisConfig } = require("../config/redis");
const JobApplication = require("../models/jobApplication");
const { computeATSScoreV2 } = require("../utils/atsScorerV2");

// Redis-backed Bull queue
const atsQueue = new Queue("ats-processing", {
    redis: redisConfig,
});

// Job processor
atsQueue.process(async (job) => {
    const { applicationId, resumeText, jobSkills } = job.data;

    try {
        console.log(`Processing ATS job for application ${applicationId}`);

        // Compute ATS score
        const atsScore = computeATSScoreV2(resumeText, jobSkills);

        // Update in DB
        await JobApplication.findByIdAndUpdate(applicationId, {
            atsScore,
            resumeSnapshot: resumeText,
        });

        console.log(`ATS score ${atsScore} saved for application ${applicationId}`);
        return { success: true, atsScore };
    } catch (err) {
        console.error("ATS job failed", err);
        throw err;
    }
});

module.exports = atsQueue;
