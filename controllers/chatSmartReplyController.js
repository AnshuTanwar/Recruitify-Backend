const ChatMessage = require("../models/chatMessage");
const JobApplication = require("../models/jobApplication");
const { generateSmartReplies } = require("../utils/geminiHelper");

/**
 * @route   POST /api/chat/:messageId/smart-reply
 * @desc    Generate AI-based smart replies for a candidate
 * @access  Candidate only
 */
exports.getSmartReplies = async (req, res, next) => {
    try {
        const { messageId } = req.params;
        const user = req.user;

        // candidate verification
        if (user.role !== "Candidate") {
            const err = new Error("Only candidates can access Smart Replies");
            err.statusCode = 403;
            return next(err);
        }

        // fetch the recruiter's message
        const message = await ChatMessage.findById(messageId)
            .populate({
                path: "room",
                populate: {
                    path: "job candidate",
                    select: "jobName resumeSnapshot fullName"
                }
            });

        if (!message) {
            const err = new Error("Message not found");
            err.statusCode = 404;
            return next(err);
        }

        // ensure candidate belongs to this chat room
        if (message.room.candidate._id.toString() !== user._id.toString()) {
            const err = new Error("Unauthorized access to this chat");
            err.statusCode = 403;
            return next(err);
        }

        // recruiter must be the sender of that message
        if (message.sender.toString() === user._id.toString()) {
            const err = new Error("Cannot generate replies for your own messages");
            err.statusCode = 400;
            return next(err);
        }

        // Try to find the application to get resume snapshot
        const application = await JobApplication.findOne({
            job: message.room.job._id,
            candidate: message.room.candidate._id
        });

        const resumeText =
            application?.resumeSnapshot ||
            message.room.job.description ||
            "No resume text available";

        const replies = await generateSmartReplies({
            lastMessage: message.text,
            resumeText,
            jobTitle: message.room.job.jobName,
            numReplies: 3,
        });

        res.json({ replies });
    } catch (err) {
        next(err);
    }
};
