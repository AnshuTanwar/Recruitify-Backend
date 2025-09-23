require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const cookieParser = require("cookie-parser");
const passport = require("passport");
require("./config/passport");

const authRoutes = require("./routes/authRoutes");
const errorHandler = require("./middlewares/errorHandler");

const app = express();
app.use(express.json());
app.use(cookieParser());
app.use(passport.initialize());

// Config
const PORT = process.env.PORT || 5050;
const URI = process.env.MONGO_URI;
if (!URI) {
    console.error("Missing MONGO_URI in .env");
    process.exit(1);
}

// Middleware
app.use(express.json());

// Database Setup
async function connectDB() {
    try {
        await mongoose.connect(URI, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
        });
        console.log("Connected to MongoDB with Mongoose");
    } catch (err) {
        console.error("MongoDB connection failed:", err.message);
        process.exit(1);
    }
}

// Routes
app.use("/api/auth", authRoutes);

app.use(errorHandler);

module.exports = app;

// Start Server
async function startServer() {
    await connectDB();
    app.listen(PORT, () => {
        console.log(`Server running on http://localhost:${PORT}`);
    });
}

startServer();