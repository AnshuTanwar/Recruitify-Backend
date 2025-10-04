/**
 * Compute a simple ATS score based on skill keyword matches
 * Later: improve with synonyms + weighting
 */
function computeATSScore(resumeText, jobSkills) {
    if (!resumeText || !jobSkills || jobSkills.length === 0) return 0;

    const textLower = resumeText.toLowerCase();
    let matches = 0;

    for (const skill of jobSkills) {
        if (textLower.includes(skill.toLowerCase())) {
            matches++;
        }
    }

    // Simple percentage score
    const score = Math.round((matches / jobSkills.length) * 100);
    return score;
}

module.exports = { computeATSScore };
