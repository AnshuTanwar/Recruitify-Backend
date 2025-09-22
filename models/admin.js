const mongoose = require("mongoose");
const User = require("./User");

const adminSchema = new mongoose.Schema({
    permissions: [{ type: String }]
});

module.exports = User.discriminator("Admin", adminSchema);
