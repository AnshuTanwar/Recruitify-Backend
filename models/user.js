const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
    fullName : {
        type: String,
        required: true,
        trim: true
    },
    email : {
        type: String,
        required: true,
        unique: true,
        lowercase: true,
        trim: true
    },
    password : {
        type: String,
        required: true
    },
    role : {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Role',
        required: true
    }
});

module.exports = mongoose.model('User', userSchema);