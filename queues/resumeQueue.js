const Queue = require("bull");
const { redisConfig } = require("../config/redis");

const resumeQueue = new Queue("resume-processing", {
    redis: redisConfig,
});

resumeQueue.on("ready", () => {
    console.log(" Resume Queue is ready");
});

resumeQueue.on("error", (err) => {
    console.error(" Queue Error:", err);
});

resumeQueue.on("failed", (job, err) => {
    console.error(`Resume job ${job.id} failed:`, err);
});


module.exports = resumeQueue;
