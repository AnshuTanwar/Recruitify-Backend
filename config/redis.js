const { createClient } = require("redis");

const redisClient = createClient({
    socket: {
        host: process.env.REDIS_HOST,
        port: parseInt(process.env.REDIS_PORT, 10),
    },
    username: process.env.REDIS_USERNAME || "default",
    password: process.env.REDIS_PASSWORD || undefined,
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

// bull expects a plain object with host/port/password (or a redis URL).
const redisConfig = {
    host: process.env.REDIS_HOST,
    port: parseInt(process.env.REDIS_PORT, 10),
    password: process.env.REDIS_PASSWORD || undefined,
};

module.exports = { redisClient, connectRedis, redisConfig };
