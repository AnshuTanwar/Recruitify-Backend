const mongoose = require("mongoose");

const chatRoomSchema = new mongoose.Schema(
    {
        job: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Job",
            required: true,
        },
        recruiter: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Recruiter",
            required: true,
        },
        candidate: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Candidate",
            required: true,
        },
        messages: [
            {
                type: mongoose.Schema.Types.ObjectId,
                ref: "ChatMessage",
            },
        ],
        lastMessage: {
            type: String,
        },
        lastMessageAt: {
            type: Date,
        },
        isClosed: {
            type: Boolean,
            default: false,
            index: true,
        },
    },
    { timestamps: true }
);

// Indexes for efficiency
chatRoomSchema.index({ recruiter: 1, candidate: 1, job: 1 }, { unique: true });
chatRoomSchema.index({ updatedAt: -1 });
chatRoomSchema.index({ lastMessageAt: -1 });

// Cleanup messages when room is deleted
chatRoomSchema.pre("findOneAndDelete", async function (next) {
    const room = await this.model.findOne(this.getFilter());
    if (room) {
        await mongoose.model("ChatMessage").deleteMany({ room: room._id });
    }
    next();
});

module.exports = mongoose.model("ChatRoom", chatRoomSchema);
