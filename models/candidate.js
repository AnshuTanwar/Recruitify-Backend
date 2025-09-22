const mongoose = require("mongoose");
const User = require("./User");

const candidateSchema = new mongoose.Schema({
    location: String,
    bio: String,
    phone: String,
    experience: Number,
    skills: [{ type: String, index: true }],
    resumes: [
        {
            url: String,
            uploadedAt: { type: Date, default: Date.now }
        }
    ],
    appliedJobs: [{ type: mongoose.Schema.Types.ObjectId, ref: "Job" }]
});

candidateSchema.path("resumes").validate(function (resumes) {
    return resumes.length <= 3;
}, "You can only upload up to 3 resumes.");

module.exports = User.discriminator("Candidate", candidateSchema);
