const Queue = require("bull");
const { redisConfig } = require("../config/redis");
const JobApplication = require("../models/jobApplication");
const { computeATSScoreV2 } = require("../utils/atsScorerV2");
const { getFileBufferFromS3 } = require("../utils/s3Helper");
const { extractTextFromResume } = require("../utils/resumeParser"); // should accept Buffer or path

// create queue
const atsQueue = new Queue("ats-processing", { redis: redisConfig });

atsQueue.on("ready", () => {
    console.log("ATS Queue ready");
});
atsQueue.on("error", (err) => {
    console.error("ATS Queue error:", err);
});
atsQueue.on("failed", (job, err) => {
    console.error(`ATS job ${job.id} failed:`, err);
});

// processor
atsQueue.process(async (job) => {
    const { applicationId, resumeKey, originalName, jobSkills } = job.data;

    try {
        console.log(`Processing ATS job for application ${applicationId}`);

        // 1) download binary from S3
        const buffer = await getFileBufferFromS3(resumeKey);

        // 2) extract text from resume buffer (resumeParser must accept buffer)
        const resumeText = await extractTextFromResume(buffer, originalName || "");
        
        if (!resumeText || resumeText.trim().length === 0) {
            console.warn(`No text extracted from resume for application ${applicationId}`);
        }

        // 3) compute score
        const atsScore = computeATSScoreV2(resumeText, jobSkills || []);

        // 4) update DB
        await JobApplication.findByIdAndUpdate(applicationId, {
            atsScore,
            resumeSnapshot: resumeText.slice(0, 100000), // cap to avoid huge docs
        });

        console.log(`ATS score ${atsScore} saved for application ${applicationId}`);
        return { success: true, atsScore };
    } catch (err) {
        console.error("ATS job failed", err);
        throw err;
    }
});

module.exports = atsQueue;
