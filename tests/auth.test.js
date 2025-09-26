const request = require("supertest");
const app = require("../server");
const User = require("../models/User");
require("./setup");
const app = require("../server");

describe("Auth APIs", () => {
    const testEmail = "testuser@example.com";
    const testPassword = "123456";

    afterAll(async () => {
        await User.deleteMany({ email: testEmail });
    });

    it("should signup a candidate", async () => {
        const res = await request(app)
        .post("/api/auth/signup")
        .send({
            fullName: "Test Candidate",
            email: testEmail,
            password: testPassword,
            role: "Candidate"
        });

        expect(res.statusCode).toBe(201);
        expect(res.body).toHaveProperty("accessToken");
        expect(res.body.user.role).toBe("Candidate");
    });

    it("should login with correct credentials", async () => {
        const res = await request(app)
        .post("/api/auth/login")
        .send({
            email: testEmail,
            password: testPassword
        });

        expect(res.statusCode).toBe(200);
        expect(res.body).toHaveProperty("accessToken");
    });

    it("should not login with wrong password", async () => {
        const res = await request(app)
        .post("/api/auth/login")
        .send({
            email: testEmail,
            password: "wrongpass"
        });

        expect(res.statusCode).toBe(400);
    });

    it("should refresh access token", async () => {
        const loginRes = await request(app)
        .post("/api/auth/login")
        .send({
            email: testEmail,
            password: testPassword
        });

        const cookies = loginRes.headers["set-cookie"];

        const res = await request(app)
        .post("/api/auth/refresh")
        .set("Cookie", cookies);

        expect(res.statusCode).toBe(200);
        expect(res.body).toHaveProperty("accessToken");
    });

    it("should logout and clear refresh token", async () => {
        const loginRes = await request(app)
        .post("/api/auth/login")
        .send({
            email: testEmail,
            password: testPassword
        });

        const cookies = loginRes.headers["set-cookie"];

        const res = await request(app)
        .post("/api/auth/logout")
        .set("Cookie", cookies);

        expect(res.statusCode).toBe(200);
        expect(res.body.message).toBe("Logged out successfully");
    });
});
