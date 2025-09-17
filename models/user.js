const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
    fullName : {
        type: String,
        required: true,
    },
    email : {
        type: String,
        required: true,
        unique: true,
        lowercase: true,
        trim: true,
        index: true
    },
    password : {
        type: String,
        required: true
    },
    role : {
        type: String,
        enum: ["admin", "candidate", "recruiter"],
        required: true
    },
    provider : {
        type: String,
        enum: ["local", "google"],
        default: "local"
    },
    avatar : {
        type: String
    },
    isActive : {
        type: Boolean,
        default: true
    },
    lastLogin: {
        type: Date
    }
}, {
    timestamps: true,
    discriminatorKey: "role"
});

module.exports = mongoose.model('User', userSchema);