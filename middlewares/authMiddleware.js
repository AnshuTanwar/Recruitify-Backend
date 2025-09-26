const jwt = require("jsonwebtoken");
const User = require("../models/User");

const protect = async (req, res, next) => {
    try {
        let token;
        if (req.headers.authorization && req.headers.authorization.startsWith("Bearer")) {
            token = req.headers.authorization.split(" ")[1];
        }
        if (!token) {
            const err = new Error("Not authorized, no token");
            err.statusCode = 401;
            return next(err);
        }
        const decoded = jwt.verify(token, process.env.JWT_SECRET || process.env.JWT_ACCESS_SECRET);
        const user = await User.findById(decoded.id);
        if (!user) {
            const err = new Error("User not found");
            err.statusCode = 401;
            return next(err);
        }
        req.user = user;
        next();
    } catch (err) {
        err.statusCode = 401;
        next(err);
    }
};

module.exports = { protect };
