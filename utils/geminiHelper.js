require('dotenv').config();
const fetch = require("node-fetch");

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
if (!GEMINI_API_KEY) {
    throw new Error("Missing GEMINI_API_KEY env variable");
}

const GEMINI_MODEL = process.env.GEMINI_MODEL || "models/gemini-2.5-flash";

/* ------------------------------------------------------
    Recruiter-Side Question Suggestions
------------------------------------------------------ */
async function generateQuestionSuggestions({ resumeText, jobTitle, numQuestions = 5 }) {
    const prompt = `
You are a recruitment assistant.
Based on the candidate's resume and the job title "${jobTitle}",
generate ${numQuestions} relevant, thoughtful interview questions
that a recruiter could ask this candidate.

Resume:
${resumeText}

Return only a JSON object with an array field "questions".
Example:
{ "questions": ["Q1...", "Q2...", "Q3..."] }
`;

    const response = await fetch(
        `https://generativelanguage.googleapis.com/v1/${GEMINI_MODEL}:generateContent`,
        {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "x-goog-api-key": GEMINI_API_KEY
            },
            body: JSON.stringify({
                contents: [{ parts: [{ text: prompt }] }],
                generationConfig: { temperature: 0.7 }
            })
        }
    );

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Gemini API error: ${response.status} ${errorText}`);
    }

    const json = await response.json();
    let generatedText = json.candidates?.[0]?.content?.parts?.[0]?.text || json.candidates?.[0]?.parts?.[0]?.text;
    if (!generatedText) {
        throw new Error("No text returned from Gemini");
    }

    // Remove markdown code blocks if present
    generatedText = generatedText.trim();
    if (generatedText.startsWith('```json')) {
        generatedText = generatedText.replace(/^```json\s*/, '').replace(/```\s*$/, '');
    } else if (generatedText.startsWith('```')) {
        generatedText = generatedText.replace(/^```\s*/, '').replace(/```\s*$/, '');
    }

    try {
        const data = JSON.parse(generatedText.trim());
        return data.questions || [];
    } catch {
        const raw = generatedText.split("\n").map(l => l.trim()).filter(Boolean);
        return raw.slice(0, numQuestions);
    }
}

/* ------------------------------------------------------
    Candidate-Side Smart Reply (Ethical Mode)
------------------------------------------------------ */
async function generateSmartReplies({ lastMessage, resumeText, jobTitle, numReplies = 3 }) {
    const prompt = `
You are an ethical AI assistant for a job candidate.

The recruiter has sent the following message:
"${lastMessage}"

The candidate's job title: ${jobTitle}
Resume text (context only):
${resumeText}

Classify the message:
- If it is a general or conversational question (like availability, expectations, or experience summary),
    suggest ${numReplies} short, polite, human-like replies based on the resume context.

- If it looks like a technical or knowledge-testing question (e.g., "Explain", "Difference between", "How does", "What is"),
    DO NOT generate any answer.
    Instead, respond with a single JSON like:
    { "ethicalWarning": "This seems like a technical test question — the candidate should answer in their own words." }

Return JSON only.

If general:
{ "replies": ["...", "...", "..."] }
`;

    const response = await fetch(
        `https://generativelanguage.googleapis.com/v1/${GEMINI_MODEL}:generateContent`,
        {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "x-goog-api-key": GEMINI_API_KEY
            },
            body: JSON.stringify({
                contents: [{ parts: [{ text: prompt }] }],
                generationConfig: { temperature: 0.6 }
            })
        }
    );

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Gemini API error: ${response.status} ${errorText}`);
    }

    const json = await response.json();
    let generatedText = json.candidates?.[0]?.content?.parts?.[0]?.text || json.candidates?.[0]?.parts?.[0]?.text;
    if (!generatedText) {
        throw new Error("No text returned from Gemini");
    }

    // Remove markdown code blocks if present
    generatedText = generatedText.trim();
    if (generatedText.startsWith('```json')) {
        generatedText = generatedText.replace(/^```json\s*/, '').replace(/```\s*$/, '');
    } else if (generatedText.startsWith('```')) {
        generatedText = generatedText.replace(/^```\s*/, '').replace(/```\s*$/, '');
    }

    try {
        const data = JSON.parse(generatedText.trim());
        if (data.ethicalWarning) return [data.ethicalWarning];
        if (Array.isArray(data.replies)) return data.replies.slice(0, numReplies);
    } catch {
        // fallback parsing
        if (generatedText.toLowerCase().includes("technical")) {
            return [
                "This seems like a technical question. Please answer it in your own words.",
            ];
        }
        const lines = generatedText.split("\n").map(l => l.trim()).filter(Boolean);
        return lines.slice(0, numReplies);
    }

    return ["Could you clarify your message?"];
}

/* ------------------------------------------------------
    Candidate-Side Resume Analyzer (Deep ATS Review)
------------------------------------------------------ */
async function analyzeResumeWithGemini({ resumeText, jobTitle, jobDescription }) {
    const prompt = `
You are an AI Resume Analyst.
Evaluate the following resume for the job title "${jobTitle}" 
and the job description below.

Job Description:
${jobDescription}

Resume Text:
${resumeText}

Provide an objective, concise JSON review with these fields:
{
    "atsScore": number (0–100),
    "summary": string,
    "strengths": [string],
    "weaknesses": [string],
    "suggestedImprovements": [string],
    "missingSkills": [string],
    "tone": string,
    "cultureFit": string,
    "layoutIssues": [string]
}
Guidelines:
- Be factual, not overly flattering.
- Detect layout issues like icons, multiple columns, or image-heavy formatting that might break ATS parsing.
- If information is missing, respond with "Not enough information".
`;

    const response = await fetch(
        `https://generativelanguage.googleapis.com/v1/${GEMINI_MODEL}:generateContent`,
        {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "x-goog-api-key": GEMINI_API_KEY
            },
            body: JSON.stringify({
                contents: [{ parts: [{ text: prompt }] }],
                generationConfig: { temperature: 0.5 }
            })
        }
    );

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Gemini API error: ${response.status} ${errorText}`);
    }

    const json = await response.json();
    let generatedText = json.candidates?.[0]?.content?.parts?.[0]?.text || json.candidates?.[0]?.parts?.[0]?.text;

    if (!generatedText) {
        return { summary: "Analysis unavailable" };
    }

    // Remove markdown code blocks if present
    generatedText = generatedText.trim();
    if (generatedText.startsWith('```json')) {
        generatedText = generatedText.replace(/^```json\s*/, '').replace(/```\s*$/, '');
    } else if (generatedText.startsWith('```')) {
        generatedText = generatedText.replace(/^```\s*/, '').replace(/```\s*$/, '');
    }

    try {
        const parsed = JSON.parse(generatedText.trim());
        // Ensure all required fields exist with defaults
        return {
            atsScore: parsed.atsScore || 0,
            summary: parsed.summary || "No summary available",
            strengths: Array.isArray(parsed.strengths) ? parsed.strengths : [],
            weaknesses: Array.isArray(parsed.weaknesses) ? parsed.weaknesses : [],
            suggestedImprovements: Array.isArray(parsed.suggestedImprovements) ? parsed.suggestedImprovements : [],
            missingSkills: Array.isArray(parsed.missingSkills) ? parsed.missingSkills : [],
            tone: parsed.tone || "Not analyzed",
            cultureFit: parsed.cultureFit || "Not analyzed",
            layoutIssues: Array.isArray(parsed.layoutIssues) ? parsed.layoutIssues : []
        };
    } catch (parseError) {
        console.error("Failed to parse Gemini response:", parseError);
        console.error("Raw response:", generatedText);
        return { 
            atsScore: 0,
            summary: generatedText || "Analysis unavailable",
            strengths: [],
            weaknesses: [],
            suggestedImprovements: [],
            missingSkills: [],
            tone: "Not analyzed",
            cultureFit: "Not analyzed",
            layoutIssues: []
        };
    }
}

module.exports = {
    generateQuestionSuggestions,
    generateSmartReplies,
    analyzeResumeWithGemini
};

