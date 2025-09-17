import mongoose from "mongoose";
import { User } from "./User.js";

const { Schema } = mongoose;

const CandidateSchema = new Schema({
    location: String,
    phone: String,
    experience: Number,
    skills: [
        {
            type: String,
            index: true,
        },
    ],
    resume: [
        {
            url: String,
            uploadedAt: { type: Date, default: Date.now },
        },
    ],
    appliedJobs: [{ type: Schema.Types.ObjectId, ref: "Job" }],
});

CandidateSchema.path("resume").validate(function (resume) {
    return !resume || resume.length <= 3;
}, "You can only upload up to 3 resumes.");

export const Candidate = User.discriminator("Candidate", CandidateSchema);
