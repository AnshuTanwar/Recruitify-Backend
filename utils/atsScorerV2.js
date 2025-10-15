const natural = require('natural');
const { PorterStemmer } = natural;

const SKILL_SYNONYMS = {
    "js": ["javascript", "nodejs", "node.js", "es6", "es7", "ecmascript"],
    "react": ["reactjs", "react.js", "react-native", "react hooks", "next.js"],
    "angular": ["angularjs", "angular.js", "ng"],
    "vue": ["vuejs", "vue.js", "nuxt.js"],
    "postgres": ["postgresql", "psql", "postgre"],
    "mysql": ["my sql", "maria db", "mariadb"],
    "mongodb": ["mongo", "mongo db", "nosql"],
    "aws": ["amazon web services", "ec2", "s3", "lambda", "cloudfront", "rds"],
    "azure": ["microsoft azure", "azure cloud", "azure devops"],
    "gcp": ["google cloud platform", "google cloud", "bigquery", "pubsub"],
    "docker": ["containerization", "docker compose"],
    "kubernetes": ["k8s", "container orchestration"],
    "python": ["py", "django", "flask"],
    "git": ["github", "gitlab", "bitbucket", "version control"],
    "devops": ["ci/cd", "continuous integration", "continuous deployment"],
    "html": ["html5"],
    "css": ["css3", "sass", "scss", "less"],
    "typescript": ["ts"],
    "redis": ["redis database", "in-memory cache", "key-value store", "cache store"],
    "memcached": ["memcache", "memory cache", "key value cache"],
    "elasticsearch": ["elastic search", "es", "full-text search"],
    "rabbitmq": ["rabbit mq", "message broker", "queue system"],
    "kafka": ["apache kafka", "event streaming", "message queue"],
};

// Weights for skills and soft skills
const SKILL_WEIGHTS = {
    "aws": 3,
    "gcp": 3,
    "azure": 3,
    "node.js": 2,
    "javascript": 2,
    "react": 2,
    "angular": 2,
    "vue": 2,
    "mongodb": 2,
    "postgres": 2,
    "mysql": 1.5,
    "docker": 1.5,
    "kubernetes": 1.5,
    "python": 2,
    "typescript": 1.5,
    "git": 1,
    "html": 0.8,
    "css": 0.8,
    "redis": 1.5,
    "memcached": 1.2,
    "elasticsearch": 1.5,
    "rabbitmq": 1.3,
    "kafka": 1.3,
};

const SOFT_SKILLS = {
    "teamwork": 0.5,
    "communication": 0.5,
    "leadership": 0.8,
    "problem solving": 0.7,
    "collaboration": 0.7,
    "adaptability": 0.6,
    "time management": 0.5,
};

const ACTION_VERBS = [
    "managed",
    "developed",
    "led",
    "designed",
    "implemented",
    "engineered",
    "created",
    "improved",
    "automated",
    "optimized",
];

/**
 * Expand skills including synonyms and stemmed forms
 */
function expandSkills(jobSkills) {
    const expanded = new Set();

    for (let skill of jobSkills) {
        skill = (skill || "").toLowerCase().trim();
        if (!skill) continue;

        const baseSkill = Object.keys(SKILL_SYNONYMS).find(base =>
            base === skill || SKILL_SYNONYMS[base].includes(skill)
        );

        if (baseSkill) {
            expanded.add(baseSkill);
            SKILL_SYNONYMS[baseSkill].forEach(s => expanded.add(s));
        } else {
            expanded.add(skill);
        }
    }

    // Add stemmed versions for more flexibility
    const toAdd = [];
    for (const s of expanded) {
        toAdd.push(PorterStemmer.stem(s));
    }
    toAdd.forEach(s => expanded.add(s));

    return Array.from(expanded);
}

/**
 * Check if keyword is in text by whole word matching with regex
 */
function keywordInText(keyword, text) {
    try {
        const escaped = keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const regex = new RegExp(`\\b${escaped}\\b`, 'i'); // whole word match, case insensitive
        return regex.test(text);
    } catch {
        return text.includes(keyword);
    }
}

/**
 * Extract experience years specifically related to skills if possible
 */
function extractExperienceYears(textLower) {
    // Match format like "X years experience in skill"
    const regex = /(\d+)\s+years?(\s+of)?\s+experience(\s+in\s+([a-z0-9\s\.\-]+))?/gi;

    let matches;
    const skillExperience = {};
    while ((matches = regex.exec(textLower)) !== null) {
        const years = parseInt(matches[1], 10);
        const skill = matches[5]?.trim();
        if (skill) {
            skillExperience[PorterStemmer.stem(skill)] = years;
        } else {
            skillExperience["general"] = years;
        }
    }
    return skillExperience;
}

/**
 * Score based on proficiency indicators near skill keywords
 */
function detectProficiency(textLower, skill) {
    // Phrases indicating expert levels
    const expertIndicators = ["expert in", "proficient in", "advanced knowledge of", "skilled at", "experienced with"];
    const beginnerIndicators = ["basic knowledge of", "familiar with", "learning", "beginner"];

    for (const phrase of expertIndicators) {
        if (textLower.includes(`${phrase} ${skill}`)) return 1.5;
    }
    for (const phrase of beginnerIndicators) {
        if (textLower.includes(`${phrase} ${skill}`)) return 0.7;
    }
    return 1; // neutral multiplier
}

/**
 * Calculate section weighting based on location of keyword
 * Simulated by looking for sections headings and assigning weights
 */
function sectionWeightForKeyword(textLower, skill) {
    // Let's simulate section weighting by splitting resume into sections with headers like 
    // "Summary", "Skills", "Experience", "Education"
    // and assign weights to those sections

    // Rough heuristic: if skill appears near "summary" or "skills" sections, higher weight
    const sectionWeights = {
        summary: 2,
        skills: 2,
        experience: 1.8,
        education: 0.5,
        others: 1,
    };

    // Find index of skill in text
    const skillIndex = textLower.indexOf(skill);
    if (skillIndex === -1) return 1;

    // Find nearest section header at or before skill index
    const headers = ["summary", "skills", "experience", "education"];
    let nearestSection = "others";
    for (const header of headers) {
        const headerIndex = textLower.lastIndexOf(header, skillIndex);
        if (headerIndex !== -1 && headerIndex <= skillIndex) {
            nearestSection = header;
            break;
        }
    }

    return sectionWeights[nearestSection] || 1;
}

/**
 * Detect if job titles in resume match target job titles
 */
function jobTitleMatchScore(resumeText, jobTitles) {
    if (!jobTitles?.length) return 0;

    const textLower = resumeText.toLowerCase();
    let score = 0;
    const usedTitles = new Set();

    for (let title of jobTitles) {
        title = title.toLowerCase().trim();
        if (!title) continue;

        // match full words or close variants
        const pattern = title.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const regex = new RegExp(`\\b${pattern}\\b`, 'i');

        if (regex.test(textLower) && !usedTitles.has(title)) {
            score += 10; // flat heavy boost per job title match
            usedTitles.add(title);
        }
    }
    return score; // arbitrary scaling, add to total ATS score
}

/**
 * Penalty for keyword stuffing - if any skill appears excessively without context
 */
function keywordStuffingPenalty(textLower, expandedSkills) {
    let penalty = 0;
    const maxAllowed = 5; // more than 5 occurrences causes penalty

    for (const skill of expandedSkills) {
        const regex = new RegExp(`\\b${skill}\\b`, "gi");
        const matches = textLower.match(regex);
        if (matches && matches.length > maxAllowed) {
            penalty += (matches.length - maxAllowed) * 0.5; // small penalty per extra occurrence
        }
    }
    return penalty;
}

/**
 * Soft skills and action verbs score bonus
 */
function softSkillBonus(textLower) {
    let bonus = 0;

    for (const skill of Object.keys(SOFT_SKILLS)) {
        if (keywordInText(skill, textLower)) {
            bonus += SOFT_SKILLS[skill];
        }
    }

    for (const verb of ACTION_VERBS) {
        if (keywordInText(verb, textLower)) {
            bonus += 0.3;
        }
    }

    return bonus;
}

/**
 * Main ATS scoring function integrating all above improvements
 * @param {string} resumeText - Candidate resume text
 * @param {string[]} jobSkills - Job required skills (base skills, optionally job titles as well)
 * @param {string[]} jobTitles - Optional job titles to match for better role alignment
 * @returns {number} Final ATS Score (0-100)
 */
function computeATSScoreV2(resumeText, jobSkills, jobTitles = []) {
    if (!resumeText || !jobSkills?.length) return 0;

    const textLower = resumeText.toLowerCase();
    const expandedSkills = expandSkills(jobSkills);

    // Extract experience by skills (stemmed for matching)
    const skillExperienceMap = extractExperienceYears(textLower);

    let score = 0;
    let maxScore = 0;

    // Score each skill with weight, proficiency, section weight, and experience factor
    for (const skill of expandedSkills) {
        const stemmedSkill = PorterStemmer.stem(skill);
        const baseWeight = SKILL_WEIGHTS[skill] || SKILL_WEIGHTS[stemmedSkill] || 1;

        maxScore += baseWeight;
        if (keywordInText(skill, textLower)) {
            const proficiencyMult = detectProficiency(textLower, skill);
            const sectionMult = sectionWeightForKeyword(textLower, skill);
            const experienceYears = skillExperienceMap[stemmedSkill] || skillExperienceMap["general"] || 0;
            const experienceMult = experienceYears >= 5 ? 1.5 : experienceYears >= 2 ? 1.2 : 1;

            // Add weighted score for skill presence multiplying all factors
            score += baseWeight * proficiencyMult * sectionMult * experienceMult;
        }
    }

    // Add job title match score
    score += jobTitleMatchScore(resumeText, jobTitles);

    // Add soft skills and action verbs bonus
    score += softSkillBonus(textLower);

    // Calculate final percentage score capped at 100
    let finalScore = Math.round((score / maxScore) * 100);

    // Apply keyword stuffing penalty
    const penalty = keywordStuffingPenalty(textLower, expandedSkills);
    finalScore = Math.max(0, finalScore - penalty);

    // Cap final score to 100 max
    finalScore = Math.min(finalScore, 100);

    return finalScore;
}

module.exports = { computeATSScoreV2 };
