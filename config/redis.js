const { createClient } = require("redis");

const redisClient = createClient({
    socket: {
        host: process.env.REDIS_HOST,
        port: process.env.REDIS_PORT,
    },
    username: process.env.REDIS_USERNAME || "default",
    password: process.env.REDIS_PASSWORD,
});

redisClient.on("error", (err) => {
    console.error("Redis Client Error:", err);
});

redisClient.on("connect", () => {
    console.log("Connected to Redis");
});

async function connectRedis() {
    if (!redisClient.isOpen) {
        await redisClient.connect();
    }
}

module.exports = { redisClient, connectRedis };
