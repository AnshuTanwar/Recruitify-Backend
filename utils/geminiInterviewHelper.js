require("dotenv").config();
const fetch = require("node-fetch");

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
if (!GEMINI_API_KEY) throw new Error("Missing GEMINI_API_KEY in .env");

const GEMINI_MODEL = process.env.GEMINI_MODEL || "models/gemini-2.5-flash";

function extractJsonString(text) {
    if (!text) return text;

    // Strip common Markdown code fences like ```json ... ```
    let cleaned = text.trim();
    if (cleaned.startsWith("```")) {
        const firstNewline = cleaned.indexOf("\n");
        const lastFence = cleaned.lastIndexOf("```\n");
        if (firstNewline !== -1) {
            cleaned = cleaned.substring(firstNewline + 1);
        }
        if (lastFence !== -1) {
            cleaned = cleaned.substring(0, lastFence);
        }
        cleaned = cleaned.trim();
    }

    const firstBrace = cleaned.indexOf("{");
    const lastBrace = cleaned.lastIndexOf("}");
    if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
        return cleaned.substring(firstBrace, lastBrace + 1);
    }

    return cleaned;
}

async function callGemini(prompt, generationConfig = { temperature: 0.5 }) {
    const url = `https://generativelanguage.googleapis.com/v1/${GEMINI_MODEL}:generateContent`;

    const resp = await fetch(url, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "x-goog-api-key": GEMINI_API_KEY
        },
        body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig
        })
    });

    if (!resp.ok) {
        const txt = await resp.text();
        throw new Error(`Gemini API error: ${resp.status} ${txt}`);
    }

    const json = await resp.json();

    // new API shape: candidates -> [ { content: { parts: [{ text }] } } ]
    const generatedText =
        json?.candidates?.[0]?.content?.parts?.[0]?.text ||
        json?.candidates?.[0]?.parts?.[0]?.text ||
        "";

    return generatedText;
}

/* Generate structured interview questions for a jobTitle */
async function generateInterviewQuestions(jobTitle, count = 6) {
    const prompt = `
You are an expert technical interviewer. Produce ${count} concise interview questions (mix of behavioural + soft-skill + 2-3 role-focused technical high-level prompts)
for the role titled "${jobTitle}".

Return ONLY JSON:
{ "questions": ["Q1...", "Q2...", ...] }
    `.trim();

    const out = await callGemini(prompt, { temperature: 0.7 });
    // try to parse JSON, fallback to lines
    try {
        const jsonText = extractJsonString(out);
        const parsed = JSON.parse(jsonText);
        if (Array.isArray(parsed.questions)) return parsed.questions;
    } catch (e) { /* fallthrough */ }

    // fallback: split lines and return first `count`
    const lines = out
        .split("\n")
        .map(l => l.trim())
        .filter(l => l && !l.startsWith("```"));
    return lines.slice(0, count);
}

/* Analyze a single answer (question + answer + context) */
async function analyzeInterviewAnswer({ question, answer, jobTitle }) {
    const prompt = `
You are an expert recruiter and interviewer.

Job Role: ${jobTitle}
Question: ${question}
Candidate Answer: ${answer}

Provide a JSON object with these fields:
{
    "score": number (0-10),
    "strengths": [string],
    "weaknesses": [string],
    "suggestedImprovement": string,
    "overallComment": string
}

Return only JSON.
    `.trim();

    const out = await callGemini(prompt, { temperature: 0.4 });

    try {
        const jsonText = extractJsonString(out);
        const parsed = JSON.parse(jsonText);
        return parsed;
    } catch (e) {
        // best-effort parsing: attempt to extract score and some lines
        const lines = out.split("\n").map(l => l.trim()).filter(Boolean);
        return {
            score: null,
            strengths: [],
            weaknesses: [],
            suggestedImprovement: lines.slice(0, 1).join(" "),
            overallComment: lines.join(" ")
        };
    }
}

/* Final evaluation of all answers (summary) */
async function generateFinalEvaluation({ allAnswers, jobTitle }) {
    const prompt = `
You are an expert hiring AI.

Job Role: ${jobTitle}
Here are the interview answers (array of objects):
${JSON.stringify(allAnswers)}

Provide a JSON summary:
{
    "overallScore": number (0-100),
    "technicalFit": string,
    "communication": string,
    "confidence": string,
    "recommendation": string,
    "raw": (optional) any raw assistant notes
}
Return only JSON
    `.trim();

    const out = await callGemini(prompt, { temperature: 0.5 });

    try {
        const jsonText = extractJsonString(out);
        const parsed = JSON.parse(jsonText);
        return parsed;
    } catch (e) {
        return { overallScore: null, technicalFit: "", communication: "", confidence: "", recommendation: "", raw: out };
    }
}

module.exports = {
    generateInterviewQuestions,
    analyzeInterviewAnswer,
    generateFinalEvaluation
};
