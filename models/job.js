const mongoose = require("mongoose");

const jobSchema = new mongoose.Schema({
    recruiter: { type: mongoose.Schema.Types.ObjectId, ref: "Recruiter", required: true },
    jobName: { type: String, required: true },
    description: String,
    skillsRequired: [{ type: String, index: true }],
    experienceRequired: { type: Number, default: 0 },
    salary: {
        min: Number,
        max: Number,
        currency: { type: String, default: "INR" },
        yearly: { type: Boolean, default: true }
    },
    type: {
        type: String,
        enum: ["full-time", "part-time", "internship", "contract"],
        default: "full-time"
    },
    status: { type: String, enum: ["open", "closed"], default: "open" },
    shortlistedCandidates: [{ type: mongoose.Schema.Types.ObjectId, ref: "Candidate" }]
}, { timestamps: true });

module.exports = mongoose.model("Job", jobSchema);
