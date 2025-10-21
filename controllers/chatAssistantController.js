const JobApplication = require("../models/jobApplication");
const { generateQuestionSuggestions } = require("../utils/geminiHelper");

exports.getSuggestedQuestions = async (req, res, next) => {
    try {
        const { applicationId } = req.params;
        const application = await JobApplication.findById(applicationId).populate("job candidate");
        if (!application) {
            const err = new Error("Application not found");
            err.statusCode = 404;
            return next(err);
        }
        const candidate = application.candidate;
        const job = application.job;

        // assume you stored resumeSnapshot
        const resumeText = application.resumeSnapshot || job.description || "No resume text available";

        const questions = await generateQuestionSuggestions({
            resumeText,
            jobTitle: job.jobName,
            numQuestions: 5
        });

        res.json({ questions });

    } catch (err) {
        next(err);
    }
};
