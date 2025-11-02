const ChatRoom = require("../models/ChatRoom");
const JobApplication = require("../models/jobApplication");
const { generateQuestionSuggestions } = require("../utils/geminiHelper");

exports.getSuggestedQuestions = async (req, res, next) => {
    try {
        const { applicationId } = req.params; // This is actually a roomId from the frontend
        
        // Try to find it as a chat room first
        const room = await ChatRoom.findById(applicationId)
            .populate("job", "jobName description")
            .populate("candidate", "fullName email");
        
        if (room) {
            // Found as a chat room
            const job = room.job;
            const candidate = room.candidate;
            
            // Try to find the application to get resume snapshot
            const application = await JobApplication.findOne({
                job: job._id,
                candidate: candidate._id
            });
            
            const resumeText = application?.resumeSnapshot || job.description || "No resume text available";
            
            const questions = await generateQuestionSuggestions({
                resumeText,
                jobTitle: job.jobName,
                numQuestions: 5
            });
            
            return res.json({ questions });
        }
        
        // Fallback: try as application ID
        const application = await JobApplication.findById(applicationId).populate("job candidate");
        if (!application) {
            const err = new Error("Chat room or application not found");
            err.statusCode = 404;
            return next(err);
        }
        
        const candidate = application.candidate;
        const job = application.job;
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
