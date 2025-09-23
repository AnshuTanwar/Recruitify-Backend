const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const User = require("../models/User");
const Candidate = require("../models/candidate");
const Recruiter = require("../models/recruiter");
const PasswordResetToken = require("../models/PasswordResetToken");
const sendEmail = require("../utils/sendEmail");
const {
    generateAccessToken,
    generateRefreshToken
} = require("../utils/jwt");

const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET;

// Signup
exports.signup = async (req, res, next) => {
    const { fullName, email, password, role } = req.body;

    try {
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            const error = new Error("Email already exists");
            error.statusCode = 400;
            return next(error);
        }

        if (!password) {
            const error = new Error("Password is required");
            error.statusCode = 400;
            return next(error);
        }

        if (!fullName) {
            const error = new Error("Full name is required");
            error.statusCode = 400;
            return next(error);
        }

        if (!role || (role !== "Candidate" && role !== "Recruiter")) {
            const error = new Error("Role must be candidate or recruiter");
            error.statusCode = 400;
            return next(error);
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
            const error = new Error("Invalid role");
            error.statusCode = 400;
            return next(error);
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
        next(err);
    }
};

// Login (local)
exports.login = async (req, res, next) => {
    const { email, password } = req.body;

    try {
        const user = await User.findOne({ email });
        if (!user) {
            const error = new Error("Invalid credentials");
            error.statusCode = 400;
            return next(error);
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            const error = new Error("Invalid credentials");
            error.statusCode = 400;
            return next(error);
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

        res.json({ user, accessToken });
    } catch (err) {
        next(err);
    }
};

// Google OAuth callback
exports.googleCallback = async (req, res, next) => {
    try {
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
    } catch (err) {
        next(err);
    }
};

// Refresh token
exports.refresh = async (req, res, next) => {
    const refreshToken = req.cookies.refreshToken;
    if (!refreshToken) {
        const error = new Error("No refresh token");
        error.statusCode = 401;
        return next(error);
    }

    try {
        const decoded = jwt.verify(refreshToken, JWT_REFRESH_SECRET);
        const user = await User.findById(decoded.id);

        if (!user || !user.refreshTokens.includes(refreshToken)) {
            const error = new Error("Invalid refresh token");
            error.statusCode = 403;
            return next(error);
        }

        const newAccessToken = generateAccessToken(user);
        res.json({ accessToken: newAccessToken });
    } catch (err) {
        err.statusCode = 403;
        next(err);
    }
};

// Logout
exports.logout = async (req, res, next) => {
    const refreshToken = req.cookies.refreshToken;

    if (refreshToken) {
        try {
            const decoded = jwt.verify(refreshToken, JWT_REFRESH_SECRET);
            const user = await User.findById(decoded.id);

            if (user) {
                user.refreshTokens = user.refreshTokens.filter(t => t !== refreshToken);
                await user.save();
            }
        } catch (err) {
            // logout ke time error ko silently handle kar sakte
        }
    }

    res.clearCookie("refreshToken");
    res.json({ message: "Logged out successfully" });
};

// Forgot Password
exports.forgotPassword = async (req, res, next) => {
    try {
        const { email } = req.body;

        const user = await User.findOne({ email });
        if (!user) {
            return res.status(200).json({ message: "If that email exists, a reset link has been sent." });
        }

        // Generate secure random token
        const resetToken = crypto.randomBytes(32).toString("hex");
        const hashedToken = await bcrypt.hash(resetToken, 10);

        // Delete old tokens if exist
        await PasswordResetToken.deleteMany({ userId: user._id });

        // Save new reset token
        await PasswordResetToken.create({
            userId: user._id,
            token: hashedToken,
            expiresAt: Date.now() + 15 * 60 * 1000
        });

        // Reset link for frontend
        const resetLink = `${process.env.CLIENT_URI}/reset-password/${user._id}/${resetToken}`;

        // Send email
        await sendEmail({
            to: user.email,
            link: resetLink
        });

        return res.status(200).json({ message: "If that email exists, a reset link has been sent." });
    } catch (err) {
        next(err);
    }
};

// Reset Password
exports.resetPassword = async (req, res, next) => {
    try {
        const { userId, token } = req.params;
        const { newPassword } = req.body;

        const resetTokenDoc = await PasswordResetToken.findOne({ userId });
        if (!resetTokenDoc) {
            const error = new Error("Invalid or expired reset link.");
            error.statusCode = 400;
            return next(error);
        }

        // Verify token validity
        const isValid = await bcrypt.compare(token, resetTokenDoc.token);
        if (!isValid || resetTokenDoc.expiresAt < Date.now()) {
            const error = new Error("Invalid or expired reset link.");
            error.statusCode = 400;
            return next(error);
        }

        // Hash new password
        const hashedPassword = await bcrypt.hash(newPassword, 10);
        await User.findByIdAndUpdate(userId, { password: hashedPassword });

        // Delete token after use
        await resetTokenDoc.deleteOne();

        return res.status(200).json({ message: "Password reset successful. You can now login with your new password." });
    } catch (err) {
        next(err);
    }
};
