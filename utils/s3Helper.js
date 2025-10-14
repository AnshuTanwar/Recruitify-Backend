require('dotenv').config();
const {
    S3Client,
    PutObjectCommand,
    DeleteObjectCommand,
    GetObjectCommand,
} = require("@aws-sdk/client-s3");
const { getSignedUrl } = require("@aws-sdk/s3-request-presigner");
const crypto = require("crypto");

const s3 = new S3Client({
    region: process.env.AWS_REGION,
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    },
});

const BUCKET = process.env.S3_BUCKET;
const PUBLIC_URL_BASE = process.env.S3_PUBLIC_URL || `https://${BUCKET}.s3.amazonaws.com`;

// Upload resume buffer to S3
async function uploadBufferToS3(buffer, contentType, originalName, userId) {
    const safeName = originalName.replace(/\s+/g, "_");
    const key = `resumes/${userId}/${Date.now()}-${crypto.randomBytes(6).toString("hex")}-${safeName}`;

    const command = new PutObjectCommand({
        Bucket: BUCKET,
        Key: key,
        Body: buffer,
        ContentType: contentType,
    });

    await s3.send(command);

    return {
        key,
        url: `${PUBLIC_URL_BASE}/${key}`,
    };
}

// Delete resume by key
async function deleteFromS3(key) {
    if (!key) return;
    const command = new DeleteObjectCommand({
        Bucket: BUCKET,
        Key: key,
    });
    await s3.send(command);
}

// Generate a presigned URL (default 15 mins)
async function getPresignedUrl(key, expiresInSeconds = 900) {
    if (!key) throw new Error("S3 key is required");

    const command = new GetObjectCommand({
        Bucket: BUCKET,
        Key: key,
    });

    return getSignedUrl(s3, command, { expiresIn: expiresInSeconds });
}

// download file from S3 and return Buffer
async function getFileBufferFromS3(key) {
    if (!key) throw new Error("S3 key is required");

    const command = new GetObjectCommand({ Bucket: BUCKET, Key: key });
    const response = await s3.send(command);

    // response.Body is a stream (Readable)
    const stream = response.Body;
    const chunks = [];
    for await (const chunk of stream) {
        chunks.push(typeof chunk === "string" ? Buffer.from(chunk) : chunk);
    }
    return Buffer.concat(chunks);
}

module.exports = {
    uploadBufferToS3,
    deleteFromS3,
    getPresignedUrl,
    getFileBufferFromS3,
};
