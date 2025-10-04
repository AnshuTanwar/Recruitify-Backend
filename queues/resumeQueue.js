const Queue = require("bull");

const resumeQueue = new Queue("resume-processing", {
    redis: {
        host: process.env.REDIS_HOST,
        port: process.env.REDIS_PORT,
        password: process.env.REDIS_PASSWORD,
    },
});

resumeQueue.on("ready", () => {
    console.log(" Resume Queue is ready");
});

resumeQueue.on("error", (err) => {
    console.error(" Queue Error:", err);
});

module.exports = resumeQueue;
