const mongoose = require("mongoose");
const User = require("./User");

const recruiterSchema = new mongoose.Schema({
    company: String,
    location: String,
    phone: String,
    bio: String,
    jobsPosted: [{ type: mongoose.Schema.Types.ObjectId, ref: "Job" }],
    isVerified: { type: Boolean, default: false }
});

module.exports = User.discriminator("Recruiter", recruiterSchema);
