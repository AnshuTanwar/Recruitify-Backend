const mongoose = require("mongoose");

const chatMessageSchema = new mongoose.Schema({
    sender: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    receiver: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    message: { type: String, required: true },
    seen: { type: Boolean, default: false }
}, { timestamps: true });

chatMessageSchema.index({ sender: 1, receiver: 1 });

module.exports = mongoose.model("ChatMessage", chatMessageSchema);
