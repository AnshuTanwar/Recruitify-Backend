require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const { connectRedis } = require("./config/redis");
const cookieParser = require("cookie-parser");
const passport = require("passport");
const cors = require("cors");
require("./config/passport");

require("./jobs/atsQueue");
const authRoutes = require("./routes/authRoutes");
const candidateRoutes = require("./routes/candidateRoutes");
const recruiterRoutes = require("./routes/recruiterRoutes");
const recruiterJobRoutes = require("./routes/recruiterJobRoutes");
const recruiterApplicationRoutes = require("./routes/recruiterApplicationRoutes")
const errorHandler = require("./middlewares/errorHandler");

const app = express();

const corsOptions = {
    origin: ['http://localhost:5173', 'https://recruitify-pi.vercel.app/'],
    credentials: true,
    optionsSuccessStatus: 200,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
};
//demo
// connect Redis at startup
connectRedis()
    .then(() => console.log(" Redis ready"))
    .catch((err) => console.error("Redis connection failed:", err));

// Middlewares
app.use(cors(corsOptions));
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

// Database Setup
async function connectDB() {
    try {
        await mongoose.connect(URI);
        console.log("Connected to MongoDB with Mongoose");
    } catch (err) {
        console.error("MongoDB connection failed:", err.message);
        process.exit(1);
    }
}

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/candidate", candidateRoutes);
app.use("/api/recruiter", recruiterRoutes);
app.use("/api/recruiter/job", recruiterJobRoutes);
app.use("/api/recruiter", recruiterApplicationRoutes);
app.use("/api", require("./routes/testRoutes"));


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