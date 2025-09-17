require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");

const app = express();

// Config
const PORT = process.env.PORT || 5050;
const URI = process.env.MONGO_URI;
if (!URI) {
    console.error("Missing MONGO_URI in .env");
    process.exit(1);
}

// Middleware
app.use(express.json());

// Database Setup (with Mongoose)
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
app.get("/", (req, res) => {
    res.send("API is working...");
});

// Start Server
async function startServer() {
    await connectDB();
    app.listen(PORT, () => {
        console.log(`Server running on http://localhost:${PORT}`);
    });
}

startServer();