const mongoose = require("mongoose");

const chatMessageSchema = new mongoose.Schema(
    {
        room: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "ChatRoom",
            required: true,
            index: true,
        },
        sender: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
        senderRole: {
            type: String,
            enum: ["Recruiter", "Candidate"],
            required: true,
        },
        text: {
            type: String,
            required: true,
            trim: true,
        },
        isSeen: {
            type: Boolean,
            default: false,
        },
    },
    { timestamps: true }
);

chatMessageSchema.index({ room: 1, createdAt: -1 });

module.exports = mongoose.model("ChatMessage", chatMessageSchema);
