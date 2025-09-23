const express = require("express");
const router = express.Router();
const passport = require("passport");
const {
  signup,
  login,
  googleCallback,
  refresh,
  logout,
  forgotPassword,
  resetPassword
} = require("../controllers/authController");

// Local Signup/Login
router.post("/signup", signup);
router.post("/login", login);

// Refresh & Logout
router.post("/refresh", refresh);
router.post("/logout", logout);

// Google OAuth
router.get(
  "/google",
  passport.authenticate("google", { scope: ["profile", "email"] })
);

router.get(
  "/google/callback",
  passport.authenticate("google", { session: false, failureRedirect: "/login" }),
  googleCallback
);

//Forgot Password and Reset
router.post("/forgot-password", forgotPassword);
router.post("/reset-password/:userId/:token", resetPassword);

module.exports = router;
