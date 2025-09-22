const mongoose = require("mongoose");

const jobApplicationSchema = new mongoose.Schema({
    candidate: { type: mongoose.Schema.Types.ObjectId, ref: "Candidate", required: true },
    job: { type: mongoose.Schema.Types.ObjectId, ref: "Job", required: true },
    status: {
        type: String,
        enum: ["applied", "shortlisted", "interview", "hired", "rejected"],
        default: "applied"
    },
    resumeSnapshot: String,
    atsScore: Number,
    recruiterNotes: String
}, { timestamps: true });

jobApplicationSchema.index({ candidate: 1, job: 1 }, { unique: true });

module.exports = mongoose.model("JobApplication", jobApplicationSchema);
