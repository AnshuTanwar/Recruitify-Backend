const jwt = require("jsonwebtoken");
const User = require("../models/User");

exports.protectSocket = async (socket, next) => {
    try {
        const token = socket.handshake.auth?.token;
        if (!token) return next(new Error("No token provided"));

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await User.findById(decoded.id);
        if (!user) return next(new Error("User not found"));

        socket.user = user;
        next();
    } catch (err) {
        console.error("Socket auth failed:", err.message);
        next(new Error("Authentication failed"));
    }
};
