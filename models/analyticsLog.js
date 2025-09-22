const mongoose = require("mongoose");

const analyticsLogSchema = new mongoose.Schema({
    action: String,
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    metadata: mongoose.Schema.Types.Mixed
}, { timestamps: true });

module.exports = mongoose.model("AnalyticsLog", analyticsLogSchema);
