const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const Candidate = require("../models/candidate");
const Recruiter = require("../models/recruiter");
const {
    generateAccessToken,
    generateRefreshToken
} = require("../utils/jwt");

const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET;

// Signup
exports.signup = async (req, res) => {
    const { fullName, email, password, role } = req.body;

    try {
        const existingUser = await User.findOne({ email });
        if (existingUser)
            return res.status(400).json({ message: "Email already exists" });

        if (!password) {
            return res.status(400).json({ message: "Password is required" });
        }

        if (!fullName) {
            return res.status(400).json({ message: "Full name is required" });
        }
        if (!role || (role !== "Candidate" && role !== "Recruiter")) {
            return res.status(400).json({ message: "Role must be candidate or recruiter" });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        let user;
        if (role === "Candidate") {
            user = await Candidate.create({
                fullName,
                email,
                password: hashedPassword,
                role,
                provider: "local"
            });
        } else if (role === "Recruiter") {
            user = await Recruiter.create({
                fullName,
                email,
                password: hashedPassword,
                role,
                provider: "local"
            });
        } else {
            return res.status(400).json({ message: "Invalid role" });
        }

        const accessToken = generateAccessToken(user);
        const refreshToken = generateRefreshToken(user);

        user.refreshTokens.push(refreshToken);
        await user.save();

        res.cookie("refreshToken", refreshToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "strict",
            maxAge: 7 * 24 * 60 * 60 * 1000
        });

        res.status(201).json({ user, accessToken });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

// Login (local)
exports.login = async (req, res) => {
    const { email, password } = req.body;

    try {
        const user = await User.findOne({ email });
        if (!user) return res.status(400).json({ message: "Invalid credentials" });

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) return res.status(400).json({ message: "Invalid credentials" });

        const accessToken = generateAccessToken(user);
        const refreshToken = generateRefreshToken(user);

        user.refreshTokens.push(refreshToken);
        await user.save();

        res.cookie("refreshToken", refreshToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "strict",
            maxAge: 7 * 24 * 60 * 60 * 1000
        });

        res.json({ user, accessToken });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

// Google OAuth callback
exports.googleCallback = async (req, res) => {
    const user = req.user;

    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user);

    user.refreshTokens.push(refreshToken);
    await user.save();

    res.cookie("refreshToken", refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "strict",
        maxAge: 7 * 24 * 60 * 60 * 1000
    });

    // Redirect to frontend with token
    res.redirect(`${process.env.CLIENT_URL}/oauth-success?token=${accessToken}`);
};

// Refresh token
exports.refresh = async (req, res) => {
    const refreshToken = req.cookies.refreshToken;
    if (!refreshToken) return res.status(401).json({ message: "No refresh token" });

    try {
        const decoded = jwt.verify(refreshToken, JWT_REFRESH_SECRET);
        const user = await User.findById(decoded.id);

        if (!user || !user.refreshTokens.includes(refreshToken)) {
            return res.status(403).json({ message: "Invalid refresh token" });
        }

        const newAccessToken = generateAccessToken(user);
        res.json({ accessToken: newAccessToken });
    } catch (err) {
        res.status(403).json({ message: "Invalid or expired refresh token" });
    }
};

// Logout
exports.logout = async (req, res) => {
    const refreshToken = req.cookies.refreshToken;

    if (refreshToken) {
        try {
            const decoded = jwt.verify(refreshToken, JWT_REFRESH_SECRET);
            const user = await User.findById(decoded.id);

            if (user) {
                user.refreshTokens = user.refreshTokens.filter(t => t !== refreshToken);
                await user.save();
            }
        } catch (err) {}
    }

    res.clearCookie("refreshToken");
    res.json({ message: "Logged out successfully" });
};
