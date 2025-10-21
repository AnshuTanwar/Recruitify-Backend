require('dotenv').config();
const fetch = require("node-fetch");

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
if (!GEMINI_API_KEY) {
    throw new Error("Missing GEMINI_API_KEY env variable");
}

const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-1.5-flash";

async function generateQuestionSuggestions({ resumeText, jobTitle, numQuestions = 5 }) {
    const prompt = `
You are a recruitment assistant. Based on the candidate's resume below and the job title “${jobTitle}”, generate ${numQuestions} relevant interview questions that the recruiter can ask the candidate.  
Resume:
${resumeText}

Return only a JSON object with an array field “questions”.
    `;

    const response = await fetch(
        "https://generativelanguage.googleapis.com/v1beta/models/" + GEMINI_MODEL + ":generateContent",
        {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "x-goog-api-key": GEMINI_API_KEY
            },
            body: JSON.stringify({
                contents: [{ parts: [ { text: prompt } ] }],
                candidateCount: 1,
                temperature: 0.7
            })
        }
    );

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Gemini API error: ${response.status} ${errorText}`);
    }

    const json = await response.json();
    const generatedText = json.candidates?.[0]?.parts?.[0]?.text;
    if (!generatedText) {
        throw new Error("No text returned from Gemini");
    }

    let data;
    try {
        data = JSON.parse(generatedText);
    } catch (e) {
        const raw = generatedText.split("\n").filter(l => l.trim());
        data = { questions: raw };
    }

    return data.questions;
}

module.exports = { generateQuestionSuggestions };
