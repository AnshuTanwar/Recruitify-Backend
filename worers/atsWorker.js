const { Worker } = require("bullmq");
const JobApplication = require("../models/jobApplication");
const { parseResumeText } = require("../utils/resumeParser");
const { computeATSScore } = require("../utils/atsScorer");

const connection = {
    host: process.env.REDIS_HOST,
    port: process.env.REDIS_PORT,
    username: "default",
    password: process.env.REDIS_PASSWORD,
};

// Worker consume karega
const worker = new Worker(
    "ats-processing",
    async (job) => {
        const { applicationId, jobSkills } = job.data;

        // Application fetch karo
        const application = await JobApplication.findById(applicationId).populate("candidate");
        if (!application) throw new Error("Application not found");

        // 1. Parse resume text
        const resumeText = await parseResumeText(application.resume.url);

        // 2. Compute ATS score
        const atsScore = computeATSScore(resumeText, jobSkills);

        // 3. Save results
        application.resumeSnapshot = resumeText.slice(0, 5000); // cap for size
        application.atsScore = atsScore;
        await application.save();

        return { applicationId, atsScore };
    },
    { connection }
);

worker.on("completed", (job, result) => {
    console.log(`ATS processed for Application ${result.applicationId} → Score: ${result.atsScore}`);
});

worker.on("failed", (job, err) => {
    console.error(`ATS failed for Job ${job.id}:`, err.message);
});
