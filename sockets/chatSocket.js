const ChatRoom = require("../models/ChatRoom");
const ChatMessage = require("../models/chatMessage");

module.exports = (io) => {
    io.on("connection", (socket) => {
        const user = socket.user;
        console.log(` ${user.fullName} connected (${user.role})`);

        // Join a room
        socket.on("joinRoom", async (roomId) => {
            const room = await ChatRoom.findById(roomId);
            if (!room) return socket.emit("error", "Room not found");

            socket.join(roomId);
            console.log(`${user.fullName} joined ${roomId}`);
        });

        // Send a message
        socket.on("sendMessage", async ({ roomId, text }) => {
            if (!text?.trim()) return;

            const message = await ChatMessage.create({
                room: roomId,
                sender: user._id,
                text: text.trim(),
                isSeen: false,
            });

            await ChatRoom.findByIdAndUpdate(roomId, {
                $push: { messages: message._id },
                lastMessage: text.trim(),
                lastMessageAt: new Date(),
            });

            io.to(roomId).emit("newMessage", {
                _id: message._id,
                sender: { _id: user._id, fullName: user.fullName, role: user.role },
                text: message.text,
                createdAt: message.createdAt,
                isSeen: false,
            });
        });

        // Seen event
        socket.on("markSeen", async (roomId) => {
            await ChatMessage.updateMany(
                { room: roomId, sender: { $ne: user._id }, isSeen: false },
                { $set: { isSeen: true } }
            );
            io.to(roomId).emit("messagesSeen", { roomId });
        });

        // Typing indicator
        socket.on("typing", (roomId) => {
            socket.to(roomId).emit("typing", { userId: user._id });
        });
        socket.on("stopTyping", (roomId) => {
            socket.to(roomId).emit("stopTyping", { userId: user._id });
        });

        // Close chat
        socket.on("closeChat", async (roomId) => {
            await ChatMessage.deleteMany({ room: roomId });
            await ChatRoom.findByIdAndDelete(roomId);
            io.to(roomId).emit("chatClosed", { roomId });
        });

        socket.on("disconnect", () => {
            console.log(`${user.fullName} disconnected`);
        });
    });
};
