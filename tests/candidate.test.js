const request = require("supertest");
const path = require("path");
const { app } = require("../server");
require("./setup");

const TEST_EMAIL = "jt.test.candidate@example.com";
const TEST_PASS = "TestPass123!";

describe("Candidate profile flows", () => {
    let accessToken;
    let uploadedResumeKey;

    it("signup candidate", async () => {
        const res = await request(app)
        .post("/api/auth/signup")
        .send({
            fullName: "JT Candidate",
            email: TEST_EMAIL,
            password: TEST_PASS,
            role: "Candidate"
        });
        expect(res.statusCode).toBe(201);
        expect(res.body).toHaveProperty("accessToken");
    });

    it("login candidate", async () => {
        const res = await request(app)
        .post("/api/auth/login")
        .send({ email: TEST_EMAIL, password: TEST_PASS });
        expect(res.statusCode).toBe(200);
        expect(res.body).toHaveProperty("accessToken");
        accessToken = res.body.accessToken;
    });

    it("get profile", async () => {
        const res = await request(app)
        .get("/api/candidate/profile")
        .set("Authorization", `Bearer ${accessToken}`);
        expect(res.statusCode).toBe(200);
        expect(res.body.email).toBe(TEST_EMAIL);
    });

    it("update profile", async () => {
        const res = await request(app)
        .put("/api/candidate/profile")
        .set("Authorization", `Bearer ${accessToken}`)
        .send({ location: "Pune", bio: "Testing", skills: ["Node.js"] });
        expect(res.statusCode).toBe(200);
        expect(res.body.location).toBe("Pune");
    });

    it("upload resume (multipart/form-data)", async () => {
        const filePath = path.join(__dirname, "fixtures", "sample.pdf");
        const res = await request(app)
        .post("/api/candidate/resumes")
        .set("Authorization", `Bearer ${accessToken}`)
        .attach("resume", filePath);
        expect(res.statusCode).toBe(201);
        expect(res.body).toHaveProperty("resume");
        expect(res.body.resume).toHaveProperty("key");
        uploadedResumeKey = res.body.resume.key;
    }, 20000);

    it("delete resume", async () => {
        // encode resumeKey if it contains slashes
        const encodedKey = encodeURIComponent(uploadedResumeKey);
        const res = await request(app)
        .delete(`/api/candidate/resumes/${encodedKey}`)
        .set("Authorization", `Bearer ${accessToken}`);
        expect(res.statusCode).toBe(200);
        expect(res.body.message).toBe("Resume deleted");
    }, 20000);
});
