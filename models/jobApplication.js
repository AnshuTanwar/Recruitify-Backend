const mongoose = require("mongoose");
const { Schema } = mongoose;

const JobApplicationSchema = new Schema({
    candidate: { type: Schema.Types.ObjectId, ref: "Candidate", required: true },
    job: { type: Schema.Types.ObjectId, ref: "Job", required: true },
    status: {
        type: String,
        enum: ["applied", "shortlisted", "interview", "hired", "rejected"],
        default: "applied",
    },
    coverLetter: { type: String },

    // store the resume snapshot used for this application (url + s3 key + originalName)
    resume: {
        url: String,
        key: String,
        originalName: String,
    },

    // optional fields
    resumeSnapshot: String, // parsed resume text (for ATS)
    atsScore: Number,
    recruiterNotes: String,
    },
    { timestamps: true }
);

// unique constraint - one application per candidate per job
JobApplicationSchema.index({ candidate: 1, job: 1 }, { unique: true });

// index job to query fast for recruiter
JobApplicationSchema.index({ job: 1, createdAt: -1 });

module.exports = mongoose.model("JobApplication", JobApplicationSchema);
