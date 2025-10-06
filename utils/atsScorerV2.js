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

const SKILL_WEIGHTS = {
    "aws": 2,
    "gcp": 2,
    "azure": 2,
    "node.js": 1.5,
    "javascript": 1.5,
    "react": 1.5,
    "angular": 1.5,
    "vue": 1.5,
    "mongodb": 1.5,
    "postgresql": 1.5,
    "mysql": 1.2,
    "docker": 1.2,
    "kubernetes": 1.2,
    "python": 1.5,
    "typescript": 1.2,
    "git": 0.5,
    "html": 0.5,
    "css": 0.5,
    "redis": 1.2,
    "memcached": 1.0,
    "elasticsearch": 1.2,
    "rabbitmq": 1.1,
    "kafka": 1.1,
};

function expandSkills(jobSkills) {
    const expanded = new Set();

    for (let skill of jobSkills) {
        skill = skill.toLowerCase();
        expanded.add(skill);

        // Add synonyms if exist
        for (const [base, syns] of Object.entries(SKILL_SYNONYMS)) {
            if (skill.includes(base) || syns.includes(skill)) {
                expanded.add(base);
                syns.forEach(s => expanded.add(s));
            }
        }
    }

    return Array.from(expanded);
}

/**
 * Compute ATS Score with weights + synonyms + experience boost
 */
function computeATSScoreV2(resumeText, jobSkills) {
    if (!resumeText || !jobSkills?.length) return 0;

    const textLower = resumeText.toLowerCase();
    const expandedSkills = expandSkills(jobSkills);

    let score = 0;
    let maxScore = 0;

    for (const skill of expandedSkills) {
        const weight = SKILL_WEIGHTS[skill] || 1;
        maxScore += weight;

        if (textLower.includes(skill)) {
            score += weight;
        }
    }

    // Simple percentage
    let finalScore = Math.round((score / maxScore) * 100);

    // Bonus: check years of experience
    const expMatch = textLower.match(/(\d+)\s+years?\s+experience/);
    if (expMatch) {
        const years = parseInt(expMatch[1], 10);
        if (years >= 5) finalScore += 5;
        else if (years >= 2) finalScore += 3;
        else if ( years >=1) finalScore += 1;
    }

    return Math.min(finalScore, 100);
}

module.exports = { computeATSScoreV2 };