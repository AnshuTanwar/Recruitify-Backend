const express = require("express");
const { redisClient } = require("../config/redis");

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

module.exports = router;
