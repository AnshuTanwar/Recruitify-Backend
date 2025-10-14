const AnalyticsLog = require("../models/analyticsLog");

exports.logAction = async (action, userId, metadata = {}) => {
    try {
        await AnalyticsLog.create({
            action,
            user: userId,
            metadata,
        });
    } catch (err) {
        console.error("Analytics log error:", err.message || err);
    }
};
