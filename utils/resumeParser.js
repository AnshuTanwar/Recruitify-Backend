const axios = require("axios");
const pdfParse = require("pdf-parse");

/**
 * Parse resume text from URL (S3 or local path)
 */
async function parseResumeText(resumeUrl) {
    try {
        // download file
        const response = await axios.get(resumeUrl, { responseType: "arraybuffer" });

        // For now handle PDFs only (can extend to DOCX later)
        const data = await pdfParse(response.data);

        return data.text || "";
    } catch (err) {
        console.error("Resume parsing failed:", err.message);
        return "";
    }
}

module.exports = { parseResumeText };
