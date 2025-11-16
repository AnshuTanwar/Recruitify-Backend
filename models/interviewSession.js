const mongoose = require("mongoose");

const AnswerSchema = new mongoose.Schema({
    question: { type: String, required: true },
    answer: { type: String, required: true },
    score: { type: Number },
    strengths: [{ type: String }],
    weaknesses: [{ type: String }],
    suggestedImprovement: { type: String },
    overallComment: { type: String }
}, { _id: false });

const FinalEvaluationSchema = new mongoose.Schema({
    overallScore: { type: Number },
    technicalFit: String,
    communication: String,
    confidence: String,
    recommendation: String,
    raw: mongoose.Schema.Types.Mixed
}, { _id: false });

const interviewSessionSchema = new mongoose.Schema({
    candidate: { type: mongoose.Schema.Types.ObjectId, ref: "Candidate", required: true },
    jobTitle: { type: String },
    questions: [{ type: String }],
    answers: [AnswerSchema],
    status: { type: String, enum: ["in_progress", "completed"], default: "in_progress" },
    finalEvaluation: FinalEvaluationSchema,
    startedAt: { type: Date, default: Date.now },
    completedAt: { type: Date }
}, { timestamps: true });

interviewSessionSchema.index({ candidate: 1, createdAt: -1 });

module.exports = mongoose.model("interviewSession", interviewSessionSchema);
