const mongoose = require("mongoose");

const roleSchema = new mongoose.Schema({
    name : {
        type: String,
        enum: ['admin', 'recruiter', 'candidate'],
        required: true,
        unique: true
    },
    permission: {
        type: [String],
        default: []
    }
}, {
    timestamps: true
});

module.exports = mongoose.model('Role', roleSchema);