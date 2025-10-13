require("dotenv").config();
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const Admin = require("./models/admin");

async function seedAdmin() {
    try {
        const URI = process.env.MONGO_URI;
        if (!URI) throw new Error("Missing MONGO_URI in .env");

        await mongoose.connect(URI);
        console.log("Connected to MongoDB");

        const existingAdmin = await Admin.findOne({ email: process.env.ADMIN_EMAIL });
        if (existingAdmin) {
            console.log("Admin already exists.");
            process.exit(0);
        }

        const hashedPassword = await bcrypt.hash(process.env.ADMIN_PASSWORD, 10);

        const admin = await Admin.create({
            fullName: process.env.ADMIN_NAME,
            email: process.env.ADMIN_EMAIL,
            password: hashedPassword,
            role: "Admin",
            permissions: ["manageReports", "manageUsers", "manageJobs"],
        });

        console.log("Admin seeded successfully:");
        console.log({
            email: admin.email,
            password: process.env.ADMIN_PASSWORD,
            role: admin.role,
        });

        process.exit(0);
    } catch (err) {
        console.error("Seeding failed:", err);
        process.exit(1);
    }
}

seedAdmin();
