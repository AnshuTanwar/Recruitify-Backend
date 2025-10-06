const Queue = require("bull");
const { redisConfig } = require("../config/redis");
const JobApplication = require("../models/jobApplication");
const { computeATSScoreV2 } = require("../utils/atsScorerV2");
const { getFileBufferFromS3 } = require("../utils/s3Helper");
const { extractTextFromResume } = require("../utils/resumeParser");

const atsQueue = new Queue("ats-processing", { redis: redisConfig });

atsQueue.process(async (job) => {
    const { applicationId, resumeKey, originalName, jobSkills } = job.data;
    try {
        console.log(`Processing ATS job for application ${applicationId}`);

        const buffer = await getFileBufferFromS3(resumeKey);
        const resumeText = await extractTextFromResume(buffer, originalName || "");

        const atsScore = computeATSScoreV2(resumeText, jobSkills);

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
