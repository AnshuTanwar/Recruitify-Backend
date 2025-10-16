const mongoose = require("mongoose");

const jobSchema = new mongoose.Schema(
    {
        recruiter: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Recruiter",
            required: true,
        },

        jobName: { type: String, required: true, index: true }, // frontend: Job Title

        companyName: { type: String, required: true },

        location: { type: String, required: true },

        type: {
            type: String,
            enum: ["full-time", "part-time", "internship", "contract"],
            default: "full-time",
        },

        salary: {
            min: { type: Number },
            max: { type: Number },
            currency: { type: String, default: "INR" },
            period: {
                type: String,
                enum: ["monthly", "yearly", "hourly"],
                default: "yearly",
            },
        },

        experienceLevel: {
            type: String,
            enum: [
                "entry-level",
                "1-2 years",
                "3-4 years",
                "senior-level",
            ],
            default: "entry-level",
        },

        education: {
            type: String,
            enum: ["high-school", "bachelor", "master", "phd"],
        },

        applicationDeadline: { type: Date },

        skillsRequired: [{ type: String, index: true }],

        description: String,

        requirements: [String],

        benefits: [String],

        status: {
            type: String,
            enum: ["open", "closed"],
            default: "open",
        },

        shortlistedCandidates: [
            {
                type: mongoose.Schema.Types.ObjectId,
                ref: "Candidate",
            },
        ],
    },
    { timestamps: true }
);

jobSchema.set("toJSON", {
    transform: (doc, ret) => {
        ret.id = ret._id;
        delete ret._id;
        delete ret.__v;
        return ret;
    },
});

module.exports = mongoose.model("Job", jobSchema);
