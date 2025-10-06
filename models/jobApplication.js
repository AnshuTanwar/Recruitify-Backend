const mongoose = require("mongoose");
const { Schema } = mongoose;

const JobApplicationSchema = new Schema(
    {
        candidate: { type: Schema.Types.ObjectId, ref: "Candidate", required: true },
        job: { type: Schema.Types.ObjectId, ref: "Job", required: true },

        status: {
            type: String,
            enum: ["applied", "shortlisted", "interview", "hired", "rejected"],
            default: "applied",
        },

        coverLetter: { type: String },

        resume: {
            url: { type: String },
            key: { type: String },
            originalName: { type: String },
        },

        resumeSnapshot: { type: String },

        atsScore: { type: Number, min: 0, max: 100 },

        recruiterNotes: { type: String },
    },
    { timestamps: true }
);

JobApplicationSchema.index({ candidate: 1, job: 1 }, { unique: true });
JobApplicationSchema.index({ job: 1, atsScore: -1 });
JobApplicationSchema.index({ job: 1, createdAt: -1 });

module.exports =
    mongoose.models.JobApplication ||
    mongoose.model("JobApplication", JobApplicationSchema);