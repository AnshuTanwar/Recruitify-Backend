require("dotenv").config();
const express = require("express");
const { MongoClient } = require("mongodb");

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

// Database Setup
let client;

async function connectDB() {
    client = new MongoClient(URI);
    try {
        await client.connect();
        console.log("Connected to MongoDB");
    } catch (err) {
        console.error("MongoDB connection failed:", err.message);
        process.exit(1);
    }
}

// Routes

// Start Server
async function startServer() {
    await connectDB();

    app.listen(PORT, () => {
        console.log(`Server running at http://localhost:${PORT}`);
    });
}

startServer();

// Graceful Shutdown
process.on("SIGINT", async () => {
    console.log("\n Shutting down...");
    if (client) await client.close();
    process.exit(0);
});