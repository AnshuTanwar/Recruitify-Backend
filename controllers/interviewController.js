const InterviewSession = require("../models/interviewSession");
const {
    generateInterviewQuestions,
    analyzeInterviewAnswer,
    generateFinalEvaluation
} = require("../utils/geminiInterviewHelper");

/**
 * POST /api/interview/start
 * Body: { jobTitle, count? }
 * Creates a session with generated questions and returns sessionId + questions
 */
exports.startInterview = async (req, res, next) => {
    try {
        const candidateId = req.user._id;
        const { jobTitle, count = 6 } = req.body;

        if (!jobTitle) {
            const err = new Error("jobTitle is required");
            err.statusCode = 400;
            return next(err);
        }

        const questions = await generateInterviewQuestions(jobTitle, count);

        const session = await InterviewSession.create({
            candidate: candidateId,
            jobTitle,
            questions,
            status: "in_progress",
            answers: []
        });

        res.status(201).json({ message: "Interview started", sessionId: session._id, questions });
    } catch (err) {
        next(err);
    }
};

/**
 * POST /api/interview/answer
 * Body: { sessionId, questionIndex?, question?, answer }
 * Returns analysis for that answer and nextQuestion if any
 */
exports.analyzeAnswer = async (req, res, next) => {
    try {
        const candidateId = req.user._id;
        const { sessionId, questionIndex, question, answer } = req.body;

        if (!sessionId || !answer) {
            const err = new Error("sessionId and answer are required");
            err.statusCode = 400;
            return next(err);
        }

        const session = await InterviewSession.findById(sessionId);
        if (!session) {
            const err = new Error("Interview session not found");
            err.statusCode = 404;
            return next(err);
        }

        if (session.candidate.toString() !== candidateId.toString()) {
            const err = new Error("Unauthorized");
            err.statusCode = 403;
            return next(err);
        }

        if (session.status === "completed") {
            const err = new Error("Interview already completed");
            err.statusCode = 400;
            return next(err);
        }

        // decide question text: either provided OR pick from session.questions using questionIndex
        let qText = question;
        if (!qText) {
            if (typeof questionIndex === "number" && session.questions[questionIndex]) {
                qText = session.questions[questionIndex];
            } else {
                const err = new Error("question or valid questionIndex required");
                err.statusCode = 400;
                return next(err);
            }
        }

        // Ask Gemini to analyze the answer
        const analysis = await analyzeInterviewAnswer({
            question: qText,
            answer,
            jobTitle: session.jobTitle
        });

        // normalize fields
        const answerObj = {
            question: qText,
            answer,
            score: typeof analysis.score === "number" ? analysis.score : null,
            strengths: Array.isArray(analysis.strengths) ? analysis.strengths : (analysis.strengths ? [analysis.strengths] : []),
            weaknesses: Array.isArray(analysis.weaknesses) ? analysis.weaknesses : (analysis.weaknesses ? [analysis.weaknesses] : []),
            suggestedImprovement: analysis.suggestedImprovement || analysis.suggestion || "",
            overallComment: analysis.overallComment || analysis.comment || ""
        };

        session.answers.push(answerObj);
        await session.save();

        // compute next question index
        const nextIndex = (typeof questionIndex === "number") ? questionIndex + 1 : session.answers.length;
        const nextQuestion = session.questions[nextIndex] || null;

        res.json({ message: "Answer analyzed", analysis: answerObj, nextQuestion });
    } catch (err) {
        next(err);
    }
};

/**
 * POST /api/interview/end
 * Body: { sessionId }
 * Run final evaluation, save finalEvaluation, mark session completed
 */
exports.endInterview = async (req, res, next) => {
    try {
        const candidateId = req.user._id;
        const { sessionId } = req.body;

        if (!sessionId) {
            const err = new Error("sessionId is required");
            err.statusCode = 400;
            return next(err);
        }

        const session = await InterviewSession.findById(sessionId);
        if (!session) {
            const err = new Error("Interview session not found");
            err.statusCode = 404;
            return next(err);
        }

        if (session.candidate.toString() !== candidateId.toString()) {
        const err = new Error("Unauthorized");
        err.statusCode = 403;
        return next(err);
    }

    if (session.status === "completed") {
        return res.json({ message: "Already completed", finalEvaluation: session.finalEvaluation });
    }

    // build allAnswers payload to pass to final evaluator
    const allAnswers = session.answers.map(a => ({
        question: a.question,
        answer: a.answer,
        score: a.score,
        strengths: a.strengths,
        weaknesses: a.weaknesses
    }));

    // call final evaluation (can be offloaded to queue for heavy loads)
    const finalEvaluation = await generateFinalEvaluation({ allAnswers, jobTitle: session.jobTitle });

    session.finalEvaluation = {
        overallScore: finalEvaluation.overallScore ?? finalEvaluation.overall_score ?? null,
        technicalFit: finalEvaluation.technicalFit ?? finalEvaluation.technical_fit ?? "",
        communication: finalEvaluation.communication ?? "",
        confidence: finalEvaluation.confidence ?? "",
        recommendation: finalEvaluation.recommendation ?? "",
        raw: finalEvaluation
    };
    session.status = "completed";
    session.completedAt = new Date();
    await session.save();

    res.json({ message: "Interview completed", finalEvaluation: session.finalEvaluation, sessionId: session._id });
    } catch (err) {
        next(err);
    }
};

/**
 * GET /api/interview/my - list sessions for candidate
 */
exports.getMySessions = async (req, res, next) => {
    try {
        const candidateId = req.user._id;
        const page = Math.max(parseInt(req.query.page || "1", 10), 1);
        const limit = Math.min(parseInt(req.query.limit || "20", 10), 100);
        const skip = (page - 1) * limit;

        const [total, sessions] = await Promise.all([
            require("../models/interviewSession").countDocuments({ candidate: candidateId }),
            require("../models/interviewSession").find({ candidate: candidateId })
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit)
        ]);

        res.json({ total, page, limit, sessions });
    } catch (err) {
        next(err);
    }
};

/**
 * GET /api/interview/:sessionId - fetch single session details (candidate only)
 */
exports.getSessionById = async (req, res, next) => {
    try {
        const candidateId = req.user._id;
        const { sessionId } = req.params;

        const session = await require("../models/interviewSession").findById(sessionId);
        if (!session) {
            const err = new Error("Session not found");
            err.statusCode = 404;
            return next(err);
        }
        if (session.candidate.toString() !== candidateId.toString()) {
            const err = new Error("Unauthorized");
            err.statusCode = 403;
            return next(err);
        }

        res.json({ session });
    } catch (err) {
        next(err);
    }
};
