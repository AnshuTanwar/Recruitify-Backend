const mongoose = require("mongoose");

const reportSchema = new mongoose.Schema({
    reportedUser: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    reporter: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    reason: String,
    status: { type: String, enum: ["pending", "reviewed", "action_taken"], default: "pending" }
}, { timestamps: true });

module.exports = mongoose.model("Report", reportSchema);
