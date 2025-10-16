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

/**
 * Extract text from resume buffer (for ATS processing)
 */
async function extractTextFromResume(buffer, originalName = "") {
    try {
        // Determine file type from originalName or assume PDF
        const isPDF = originalName.toLowerCase().endsWith('.pdf') || !originalName;
        
        if (isPDF) {
            // Parse PDF buffer directly
            const data = await pdfParse(buffer);
            return data.text || "";
        } else {
            // For non-PDF files, we could add DOCX parsing here
            // For now, return empty string for unsupported formats
            console.warn(`Unsupported file format for resume parsing: ${originalName}`);
            return "";
        }
    } catch (err) {
        console.error("Resume text extraction failed:", err.message);
        return "";
    }
}

module.exports = { parseResumeText, extractTextFromResume };
