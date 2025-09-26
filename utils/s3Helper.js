const { S3Client, PutObjectCommand, DeleteObjectCommand } = require("@aws-sdk/client-s3");

const s3 = new S3Client({
    region: process.env.AWS_REGION,
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    },
});

async function uploadBufferToS3(buffer, contentType, originalName, userId) {
    const key = `resumes/${userId}/${Date.now()}-${originalName.replace(/\s+/g, "_")}`;
    const command = new PutObjectCommand({
        Bucket: process.env.S3_BUCKET,
        Key: key,
        Body: buffer,
        ContentType: contentType,
    });
    await s3.send(command);
    return {
        key,
        url: `${process.env.S3_PUBLIC_URL}/${key}`,
    };
}

async function deleteFromS3(key) {
    const command = new DeleteObjectCommand({
        Bucket: process.env.S3_BUCKET,
        Key: key,
    });
    await s3.send(command);
}

module.exports = { uploadBufferToS3, deleteFromS3 };
