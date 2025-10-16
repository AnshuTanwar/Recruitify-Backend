const Job = require("../models/job");
const Candidate = require("../models/candidate");
const JobApplication = require("../models/jobApplication");

// POST /api/recruiter/jobs
exports.createJob = async (req, res, next) => {
    try {
        const recruiterId = req.user._id; // recruiter authenticated

        const {
            jobName,
            companyName,
            location,
            type,
            minSalary,
            maxSalary,
            salaryType,
            experienceLevel,
            education,
            applicationDeadline,
            skillsRequired,
            description,
            requirements,
            benefits,
        } = req.body;

        const job = await Job.create({
            recruiter: recruiterId,
            jobName,
            companyName,
            location,
            type,
            salary: {
                min: minSalary,
                max: maxSalary,
                period: salaryType,
            },
            experienceLevel,
            education,
            applicationDeadline,
            skillsRequired,
            description,
            requirements,
            benefits,
        });

        res.status(201).json(job);
    } catch (err) {
        next(err);
    }
};


// GET /api/recruiter/jobs
exports.getRecruiterJobs = async (req, res, next) => {
    try {
        const recruiterId = req.user._id;
        const jobs = await Job.find({ recruiter: recruiterId }).sort("-createdAt");
        
        // Add application count for each job
        const jobsWithApplications = await Promise.all(
            jobs.map(async (job) => {
                const applicationCount = await JobApplication.countDocuments({ job: job._id });
                return {
                    ...job.toObject(),
                    applications: applicationCount
                };
            })
        );
        
        res.json(jobsWithApplications);
    } catch (err) {
        next(err);
    }
};

// PUT /api/recruiter/jobs/:id
exports.updateJob = async (req, res, next) => {
    try {
        const recruiterId = req.user._id;
        const jobId = req.params.id;

        const {
            jobName,
            companyName,
            location,
            type,
            minSalary,
            maxSalary,
            salaryType,
            experienceLevel,
            education,
            applicationDeadline,
            skillsRequired,
            description,
            requirements,
            benefits,
            status,
        } = req.body;

        // Build the updated fields safely (avoiding direct req.body usage)
        const updatedData = {};

        if (jobName !== undefined) updatedData.jobName = jobName;
        if (companyName !== undefined) updatedData.companyName = companyName;
        if (location !== undefined) updatedData.location = location;
        if (type !== undefined) updatedData.type = type;

        if (
            minSalary !== undefined ||
            maxSalary !== undefined ||
            salaryType !== undefined
        ) {
            updatedData.salary = {};
            if (minSalary !== undefined) updatedData.salary.min = minSalary;
            if (maxSalary !== undefined) updatedData.salary.max = maxSalary;
            if (salaryType !== undefined)
                updatedData.salary.period = salaryType;
        }

        if (experienceLevel !== undefined)
            updatedData.experienceLevel = experienceLevel;
        if (education !== undefined) updatedData.education = education;
        if (applicationDeadline !== undefined)
            updatedData.applicationDeadline = applicationDeadline;
        if (skillsRequired !== undefined)
            updatedData.skillsRequired = skillsRequired;
        if (description !== undefined) updatedData.description = description;
        if (requirements !== undefined) updatedData.requirements = requirements;
        if (benefits !== undefined) updatedData.benefits = benefits;
        if (status !== undefined) updatedData.status = status;

        const job = await Job.findOneAndUpdate(
            { _id: jobId, recruiter: recruiterId },
            updatedData,
            { new: true }
        );

        if (!job) {
            const error = new Error("Job not found or unauthorized");
            error.statusCode = 404;
            return next(error);
        }

        res.json(job);
    } catch (err) {
        next(err);
    }
};


// DELETE /api/recruiter/jobs/:id
exports.deleteJob = async (req, res, next) => {
    try {
        const recruiterId = req.user._id;
        const jobId = req.params.id;

        const job = await Job.findOneAndDelete({ _id: jobId, recruiter: recruiterId });

        if (!job) {
            const error = new Error("Job not found or unauthorized");
            error.statusCode = 404;
            return next(error);
        }

        res.json({ message: "Job deleted successfully" });
    } catch (err) {
        next(err);
    }
};

exports.getJobApplications = async (req, res, next) => {
    try {
        const { id: jobId } = req.params;
        console.log(`Getting applications for jobId: ${jobId}, recruiterId: ${req.user._id}`);

        const job = await Job.findOne({ _id: jobId, recruiter: req.user._id });
        if (!job) {
            // Check if job exists but belongs to different recruiter
            const jobExists = await Job.findOne({ _id: jobId });
            if (jobExists) {
                console.log(`Job ${jobId} exists but belongs to recruiter ${jobExists.recruiter}, not ${req.user._id}`);
                const err = new Error("Job not found or unauthorized");
                err.statusCode = 403;
                return next(err);
            } else {
                console.log(`Job ${jobId} does not exist in database`);
                const err = new Error("Job not found");
                err.statusCode = 404;
                return next(err);
            }
        }

        const applications = await JobApplication.find({ job: jobId })
            .populate("candidate", "fullName email skills phone location")
            .populate("job", "jobName skillsRequired type salary")
            .sort({ atsScore: -1, createdAt: -1 }); // sort by ATS score desc

        res.json({ count: applications.length, applications });
    } catch (err) {
        next(err);
    }
};

// GET /api/recruiter/jobs/applications (all applications for recruiter)
exports.getAllRecruiterApplications = async (req, res, next) => {
    try {
        const recruiterId = req.user._id;
        
        // Get all jobs for this recruiter
        const jobs = await Job.find({ recruiter: recruiterId }).select('_id');
        const jobIds = jobs.map(job => job._id);
        
        // Build filter
        let filter = { job: { $in: jobIds } };
        
        // Status filtering
        if (req.query.status === "pending") {
            filter.atsScore = null;
        } else if (req.query.status === "scored") {
            filter.atsScore = { $ne: null };
        } else if (req.query.status) {
            // Generic status filter for values like shortlisted/rejected/pending etc.
            filter.status = req.query.status;
        }

        // ATS Score filtering
        if (req.query.atsScore) {
            switch (req.query.atsScore) {
                case 'high':
                    filter.atsScore = { $gte: 80 };
                    break;
                case 'medium':
                    filter.atsScore = { $gte: 60, $lt: 80 };
                    break;
                case 'low':
                    filter.atsScore = { $gte: 40, $lt: 60 };
                    break;
                case 'very-low':
                    filter.atsScore = { $lt: 40 };
                    break;
                case 'pending':
                    filter.atsScore = null;
                    break;
                case 'scored':
                    filter.atsScore = { $ne: null };
                    break;
            }
        }

        // Job filtering
        if (req.query.jobId) {
            filter.job = req.query.jobId;
        }
        
        // Get all applications for these jobs with filtering
        const applications = await JobApplication.find(filter)
            .populate("candidate", "fullName email skills phone location")
            .populate("job", "jobName skillsRequired type salary")
            .sort({ atsScore: -1, createdAt: -1 });
        
        res.json({ count: applications.length, applications });
    } catch (err) {
        next(err);
    }
};
