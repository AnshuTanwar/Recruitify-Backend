const ChatRoom = require("../models/ChatRoom");
const ChatMessage = require("../models/chatMessage");
const Job = require("../models/job");
const Candidate = require("../models/candidate");

// Get all chat rooms for a candidate
// GET /api/chat/candidate-rooms
exports.getCandidateRooms = async (req, res, next) => {
    try {
        const candidateId = req.user._id;

        const rooms = await ChatRoom.find({ candidate: candidateId, isClosed: false })
            .populate("job", "jobName company")
            .populate("recruiter", "fullName email")
            .sort({ lastMessageAt: -1 });

        res.json({ rooms });
    } catch (err) {
        next(err);
    }
};

// Get all chat rooms for a recruiter
// GET /api/chat/recruiter-rooms
exports.getRecruiterRooms = async (req, res, next) => {
    try {
        const recruiterId = req.user._id;

        const rooms = await ChatRoom.find({ recruiter: recruiterId, isClosed: false })
            .populate("job", "jobName company")
            .populate("candidate", "fullName email")
            .sort({ lastMessageAt: -1 });

        res.json({ rooms });
    } catch (err) {
        next(err);
    }
};

// Create or get existing chat room
// POST /api/chat/initiate
exports.initiateChatRoom = async (req, res, next) => {
    try {
        const { jobId, candidateId } = req.body;
        const recruiterId = req.user._id;

        if (!jobId || !candidateId) {
            const err = new Error("jobId and candidateId are required");
            err.statusCode = 400;
            return next(err);
        }

        // check job ownership
        const job = await Job.findById(jobId);
        if (!job || job.recruiter.toString() !== recruiterId.toString()) {
            const err = new Error("Job not found or unauthorized");
            err.statusCode = 403;
            return next(err);
        }

        // check candidate existence
        const candidate = await Candidate.findById(candidateId);
        if (!candidate) {
            const err = new Error("Candidate not found");
            err.statusCode = 404;
            return next(err);
        }

        // check if room already exists
        let room = await ChatRoom.findOne({ recruiter: recruiterId, candidate: candidateId, job: jobId });

        // if not, create it
        if (!room) {
            room = await ChatRoom.create({
                recruiter: recruiterId,
                candidate: candidateId,
                job: jobId,
            });
        }

        // populate details for frontend
        await room.populate("job", "jobName");
        await room.populate("candidate", "fullName email");
        await room.populate("recruiter", "fullName email");

        res.status(200).json({
            message: "Chat room ready",
            room,
            isNew: !room.messages?.length,
        });
    } catch (err) {
        next(err);
    }
};

// Create or send message
// POST /api/chat/:roomId/message
exports.createMessage = async (req, res, next) => {
    try {
        const { roomId } = req.params;
        const { text } = req.body;
        const senderId = req.user._id;

        if (!text?.trim()) {
            const err = new Error("Message text is required");
            err.statusCode = 400;
            return next(err);
        }

        const room = await ChatRoom.findById(roomId);
        if (!room) {
            const err = new Error("Chat room not found");
            err.statusCode = 404;
            return next(err);
        }

        if (room.isClosed) {
            const err = new Error("Chat is closed");
            err.statusCode = 403;
            return next(err);
        }

        // Create new message
        const message = await ChatMessage.create({
            room: roomId,
            sender: senderId,
            senderRole: req.user.role, // "Recruiter" or "Candidate"
            text: text.trim(),
            isSeen: false,
        });

        // Push message into chat room
        room.messages.push(message._id);
        room.lastMessage = text.trim();
        room.lastMessageAt = new Date();
        await room.save();

        res.status(201).json({ message: "Message sent", data: message });
    } catch (err) {
        next(err);
    }
};


// Mark messages as seen
// PUT /api/chat/:roomId/seen
exports.markAsSeen = async (req, res, next) => {
    try {
        const { roomId } = req.params;
        const userId = req.user._id;

        const room = await ChatRoom.findById(roomId);
        if (!room) {
            const err = new Error("Chat room not found");
            err.statusCode = 404;
            return next(err);
        }

        await ChatMessage.updateMany(
            { room: roomId, sender: { $ne: userId }, isSeen: false },
            { $set: { isSeen: true } }
        );

        res.json({ message: "Messages marked as seen" });
    } catch (err) {
        next(err);
    }
};


// Get paginated messages for a room
// GET /api/chat/:roomId/messages?page=1&limit=20
exports.getMessages = async (req, res, next) => {
    try {
        const { roomId } = req.params;
        const page = Math.max(parseInt(req.query.page || "1", 10), 1);
        const limit = Math.min(parseInt(req.query.limit || "20", 10), 100);
        const skip = (page - 1) * limit;

        const room = await ChatRoom.findById(roomId)
            .populate("job", "jobName")
            .populate("recruiter", "fullName email")
            .populate("candidate", "fullName email");
        if (!room) {
            const err = new Error("Chat room not found");
            err.statusCode = 404;
            return next(err);
        }

        // Authorization: Check if user is part of this chat room
        const userId = req.user._id.toString();
        const isParticipant = 
            room.recruiter._id.toString() === userId || 
            room.candidate._id.toString() === userId;

        if (!isParticipant) {
            const err = new Error("Unauthorized to access this chat");
            err.statusCode = 403;
            return next(err);
        }

        const [total, messages] = await Promise.all([
            ChatMessage.countDocuments({ room: roomId }),
            ChatMessage.find({ room: roomId })
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit)
                .populate("sender", "fullName role")
        ]);

        res.json({
            total,
            page,
            limit,
            messages: messages.reverse(), // oldest → newest
            room,
        });
    } catch (err) {
        next(err);
    }
};


// Close and delete chat room
// DELETE /api/chat/:roomId
exports.closeChat = async (req, res, next) => {
    try {
        const { roomId } = req.params;

        const room = await ChatRoom.findById(roomId);
        if (!room) {
            const err = new Error("Chat room not found");
            err.statusCode = 404;
            return next(err);
        }

        if (room.recruiter.toString() !== req.user._id.toString() && 
            room.candidate.toString() !== req.user._id.toString()) {
            const err = new Error("Unauthorized to delete this chat");
            err.statusCode = 403;
            return next(err);
        }

        await ChatMessage.deleteMany({ room: roomId });
        await ChatRoom.findByIdAndDelete(roomId);

        res.json({ message: "Chat closed and deleted from both ends" });
    } catch (err) {
        next(err);
    }
};
