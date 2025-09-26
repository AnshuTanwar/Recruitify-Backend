const Recruiter = require("../models/recruiter");
const User = require("../models/User");

// GET /api/recruiter/profile
exports.getProfile = async (req, res, next) => {
    try {
        const recruiter = await Recruiter.findById(req.user._id).select("-password");
        if (!recruiter) {
            const err = new Error("Recruiter profile not found");
            err.statusCode = 404;
            return next(err);
        }
        res.json(recruiter);
    } catch (err) {
        next(err);
    }
};

// PUT /api/recruiter/profile
exports.updateProfile = async (req, res, next) => {
    try {
        const updates = {};
        const allowed = ["fullName", "company", "location", "phone", "bio"];
        allowed.forEach(field => {
            if (req.body[field] !== undefined) updates[field] = req.body[field];
        });

        if (updates.fullName) {
            await User.findByIdAndUpdate(req.user._id, { fullName: updates.fullName });
            delete updates.fullName;
        }

        const recruiter = await Recruiter.findByIdAndUpdate(req.user._id, updates, { new: true }).select("-password");
        res.json(recruiter);
    } catch (err) {
        next(err);
    }
};
