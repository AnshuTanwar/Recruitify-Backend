const multer = require("multer");
const MAX_SIZE = parseInt(process.env.MAX_RESUME_SIZE_BYTES || "5000000", 10);

// memory storage - we'll push buffer straight to S3
const storage = multer.memoryStorage();

function fileFilter(req, file, cb) {
    const allowed = ["application/pdf", "application/msword", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"];
    if (!allowed.includes(file.mimetype)) {
        return cb(new Error("Only PDF / DOC / DOCX allowed"), false);
    }
    cb(null, true);
}

const upload = multer({
    storage,
    fileFilter,
    limits: { fileSize: MAX_SIZE }
});

module.exports = upload;
