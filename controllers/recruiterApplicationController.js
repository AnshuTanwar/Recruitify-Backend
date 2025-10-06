const Job = require("../models/job");
const JobApplication = require("../models/jobApplication");

exports.getApplications = async (req, res, next) => {
    try {
        const recruiterId = req.user._id;

        // recruiter ke saare jobs nikal lo
        const jobs = await Job.find({ recruiter: recruiterId }).select("_id");
        const jobIds = jobs.map(j => j._id);

        if (!jobIds.length) {
            return res.json({ count: 0, applications: [] });
        }

        // --- Query Filters ---
        let filter = { job: { $in: jobIds } };

        // jobId filter
        if (req.query.jobId) {
            filter.job = req.query.jobId;
        }

        // status filter (shortlisted / rejected / pending etc.)
        if (req.query.status) {
            filter.status = req.query.status; 
        }

        // --- Sorting ---
        const sortParam = req.query.sort;
        let sort = { createdAt: -1 }; // default: latest
        if (sortParam === "ats") {
            sort = { atsScore: -1 }; // ATS high to low
        } else if (sortParam === "oldest") {
            sort = { createdAt: 1 }; // oldest first
        }

        // --- Fetch Applications ---
        const applications = await JobApplication.find(filter)
            .populate("candidate", "fullName email skills")
            .populate("job", "jobName skillsRequired")
            .sort(sort);

        res.json({ count: applications.length, applications });
    } catch (err) {
        next(err);
    }
};
