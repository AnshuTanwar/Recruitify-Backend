module.exports = function authorizeRoles(...roles) {
    return (req, res, next) => {
        if (!req.user) {
            const err = new Error("Not authenticated");
            err.statusCode = 401;
            return next(err);
        }
        // req.user.role must match exact discriminator name (e.g. "Candidate" / "Recruiter" / "Admin")
        if (!roles.includes(req.user.role)) {
            const err = new Error("Forbidden: Access denied");
            err.statusCode = 403;
            return next(err);
        }
        next();
    };
};
