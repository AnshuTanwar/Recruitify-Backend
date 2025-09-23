const nodemailer = require("nodemailer");

async function sendEmail({ to, link }) {
    try {
        let transporter = nodemailer.createTransport({
            service: "gmail",
            auth: {
                user: process.env.EMAILJS_USER,
                pass: process.env.EMAILJS_PASSWORD
            }
        });

        let mailOptions = {
            from: process.env.EMAILJS_USER,
            to: to,
            subject: "Password Reset Link",
            text: `Click on the following link to reset your password: ${link}`
        };

        let info = await transporter.sendMail(mailOptions);

        return info;
    } catch (error) {
        console.error("Nodemailer send error:", error);
        throw new Error("Failed to send email");
    }
}

module.exports = sendEmail;
