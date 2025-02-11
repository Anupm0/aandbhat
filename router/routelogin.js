// authRoutes.js

const express = require('express');
const mongoose = require('mongoose');
const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const AppleStrategy = require('passport-apple');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const nodemailer = require('nodemailer');
const crypto = require('crypto');
const twilio = require('twilio');

const router = express.Router();

// ======== Schema Definition ========
const userSchema = new mongoose.Schema({
    email: { type: String, required: false, unique: true },
    password: { type: String },
    mobile: { type: String, unique: true, sparse: true },
    isEmailVerified: { type: Boolean, default: false },
    isMobileVerified: { type: Boolean, default: false },
    verificationToken: { type: String },
    authProvider: { type: String, enum: ['local', 'google', 'apple'], default: 'local' },
    providerId: { type: String },
    otp: { type: String },
    resendattempt: { type: Number, default: 0 },
    role: { type: String, default: 'user' },
    vehicle: { type: String },
    resendattempt: { type: Number, default: 0 },
    address: { type: String },
    wallet: { id: { type: String }, balance: { type: Number, default: 0 } },
    otpExpiry: { type: Date }
});
const User = mongoose.model('User', userSchema);

// ======== Config & Helpers ========
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

// Create a nodemailer transporter for sending emails
const transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST || "smtp.hostinger.com",
    port: Number(process.env.EMAIL_PORT) || 465,
    secure: true,
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    },
    tls: { ciphers: "SSLv3" }
});

/**
 * Formats a mobile number.
 * If not already in international format, prepends a default country code.
 */
function formatMobile(mobile) {
    if (!mobile) return null;
    mobile = mobile.replace(/\s+/g, '');
    return mobile.startsWith('+') ? mobile : `+91${mobile}`;
}

/**
 * Generates a random 6-digit OTP.
 */
function generateOTP() {
    return Math.floor(100000 + Math.random() * 900000).toString();
}

/**
 * Generates a JWT token.
 */
function generateToken(user) {
    return jwt.sign(
        { userId: user._id, email: user.email },
        JWT_SECRET,
        { expiresIn: JWT_EXPIRES_IN }
    );
}

/**
 * Generates a secure email verification token.
 */
function generateVerificationToken() {
    return crypto.randomBytes(16).toString('hex');
}

// ======== Routes ========

/**
 * POST /signup
 * Registers a new user using email, password, and optionally mobile.
 */
router.post('/signup', async (req, res) => {
    try {
        const { email, password, mobile } = req.body;
        if (!email || !password || !mobile) {
            return res.status(400).json({ message: 'Email and password are required.' });
        }

        // Check if the user already exists.
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({ message: 'Email already registered.' });
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        const verificationToken = generateVerificationToken();

        const newUser = new User({
            email,
            password: hashedPassword,
            mobile: mobile ? formatMobile(mobile) : undefined,
            authProvider: 'local',
            verificationToken
        });
        await newUser.save();

        // Create a verification link.
        const protocol = req.protocol;
        const host = req.get('host'); // Gets current server hostname
        const verificationLink = `${protocol}://${host}/api/auth/verify-email/${verificationToken}`;
        // Send verification email.
        console.log('verificationLink:', verificationLink);
        await transporter.sendMail({
            from: process.env.EMAIL_USER,
            to: email,
            subject: 'Verify Your Email',
            html: `
        <h1>Email Verification</h1>
        <p>Please click the link below to verify your email address:</p>
        <a href="${verificationLink}">Verify Email</a>
        <p>This link will expire in 24 hours.</p>
        <p>If you did not create an account, please ignore this email.</p>
      `
        });

        res.status(201).json({ message: 'Registration successful. Check your email to verify your account.' });
    } catch (error) {
        console.error('Signup error:', error);
        res.status(500).json({ message: 'Internal server error', error: error.message });
    }
});

/**
 * GET /verify-email/:token/
 * Verifies a user's email address.
 */
router.get('/verify-email/:token', async (req, res) => {
    try {
        const { token, email } = req.params;
        const user = await User.findOne({
            verificationToken: token,
        });
        if (!user) {
            return res.status(400).json({ message: 'Invalid or expired verification link.' });
        }

        user.isEmailVerified = true;
        user.verificationToken = undefined;
        await user.save();
        res.json({ message: 'Email verified successfully. You can login now' });
    } catch (error) {
        console.error('Email verification error:', error);
        res.status(500).json({ message: 'Internal server error', error: error.message });
    }
});

/**
 * POST /verify-mobile
 * Verifies a user's mobile number using an OTP.
 */
router.post('/verify-mobile', async (req, res) => {
    try {



        const { mobile, otp } = req.body;
        if (!mobile || !otp) {
            return res.status(400).json({ message: 'Mobile number and OTP are required.' });
        }
        const user = await User.findOne({
            mobile: formatMobile(mobile),
            otp,
            otpExpiry: { $gt: new Date() }
        });
        if (!user) {
            return res.status(400).json({ message: 'Invalid or expired OTP.' });
        }
        user.isMobileVerified = true;
        user.otp = undefined;
        user.otpExpiry = undefined;
        await user.save();

        const token = generateToken(user);
        res.json({ token });
    } catch (error) {
        console.error('Mobile verification error:', error);
        res.status(500).json({ message: 'Internal server error', error: error.message });
    }
});

/**
 * POST /resend-otp
 * Resends OTP via SMS (if mobile provided) or email.
 */
router.post('/send-otp-mobile', async (req, res) => {
    try {
        const { mobile } = req.body;
        if (!email && !mobile) {
            return res.status(400).json({ message: 'Email or mobile number is required.' });
        }
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(400).json({ message: 'User not found.' });
        }
        if (user.resendattempt >= 3) {
            return res.status(400).json({ message: 'Maximum resend attempts reached. Try again later.' });
        }
        if (user.mobile && !mobile) {
            return res.status(400).json({ message: 'Mobile number is required.' });
        }

        const otp = generateOTP();
    }
    catch (error) {
        console.error('Resend OTP error:', error);
        res.status(500).json({ message: 'Internal server error', error: error.message });
    }

});

/**
 * POST /login
 * Authenticates a user using email and password, then sends an OTP.
 */
router.post('/login-second', async (req, res) => {
    try {
        const { email, password } = req.body;
        if (!email || !password) {
            return res.status(400).json({ message: 'Email, mobile and password are required.' });
        }
        const user = await User.findOne({ email });
        if (!user || user.authProvider !== 'local') {
            return res.status(400).json({ message: 'Invalid credentials.' });
        }

        const isPasswordValid = await bcrypt.compare(password, user.password);
        if (!isPasswordValid) {
            return res.status(400).json({ message: 'Invalid credentials.' });
        }

        if (!user.isEmailVerified) {
            return res.status(400).json({ message: 'Please verify your email first.' });
        }

        const verificationLink = `${req.protocol}://${req.get('host')}/api/auth/verify-email/${user.verificationToken}`;
        await transporter.sendMail({
            from: process.env.EMAIL_USER,
            to: email,
            subject: 'Login Alert',
            html: `
        <h1>Login Alert</h1>
        <p>Your account was just logged into from a new device.</p>
        <p>If this was you, you can ignore this email.</p>
        <p>If this wasn't you, please click the link below to secure your account:</p>
        <a href="${verificationLink}">Secure Account</a>
        `
        });

        const token = generateToken(user);
        res.json({ token });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ message: 'Internal server error', error: error.message });
    }
});




router.post('/login', async (req, res) => {
    try {
        const { mobile } = req.body;
        if (!mobile) {
            return res.status(400).json({ message: 'Mobile number is required.' });
        }
        const user = await User.findOne({ mobile: formatMobile(mobile) });
        if (!user) {
            return res.status(400).json({ message: 'User not found.' });
        }
        if (!user.isMobileVerified) {
            return res.status(400).json({ message: 'Mobile number not verified.' });
        }
        const otp = generateOTP();
        user.otp = otp;
        user.otpExpiry = new Date(Date.now() + 10 * 60 * 1000);
        await user.save();

        // Send OTP via SMS using Twilio
        const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
        await client.messages.create({
            body: `Your OTP is: ${otp}`,
            from: process.env.TWILIO_PHONE_NUMBER,
            to: formatMobile(mobile)
        });

        res.json({ message: 'OTP sent successfully.' });

    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ message: 'Internal server error', error: error.message });
    }
});


router.post('/verify-login-otp', async (req, res) => {
    try {
        const { mobile, otp } = req.body;
        const user = await User.findOne({
            mobile: formatMobile(mobile),
            otp,
            otpExpiry: { $gt: new Date() }
        });
        if (!user) {
            return res.status(400).json({ message: 'Invalid or expired OTP' });
        }
        user.otp = undefined;
        user.otpExpiry = undefined;
        await user.save();
        const token = generateToken(user);
        res.json({ token, message: 'Login successful' });

    } catch (error) {
        console.error('OTP verification error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});


// ======== OAuth with Google ========
passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: '/api/auth/google/callback'
},
    async (accessToken, refreshToken, profile, done) => {
        try {
            let user = await User.findOne({ email: profile.emails[0].value });
            if (!user) {
                user = new User({
                    email: profile.emails[0].value,
                    isEmailVerified: true,
                    authProvider: 'google',
                    providerId: profile.id
                });
                await user.save();
            }
            return done(null, user);
        } catch (error) {
            return done(error, null);
        }
    }));

router.get('/google', passport.authenticate('google', { scope: ['profile', 'email'] }));

router.get('/google/callback', passport.authenticate('google', { session: false }), (req, res) => {
    const token = generateToken(req.user);
    // Redirect using FRONTEND_URL from environment variables.
    res.redirect(`${process.env.FRONTEND_URL}/auth?token=${token}`);
});

// ======== OAuth with Apple ========

passport.use(new AppleStrategy({
    clientID: process.env.APPLE_CLIENT_ID,
    teamID: process.env.APPLE_TEAM_ID,
    keyID: process.env.APPLE_KEY_ID,
    privateKeyLocation: process.env.APPLE_PRIVATE_KEY_LOCATION,
    callbackURL: '/api/auth/apple/callback'
},
    async (accessToken, refreshToken, profile, done) => {
        try {
            let user = await User.findOne({ email: profile.email });
            if (!user) {
                user = new User({
                    email: profile.email,
                    isEmailVerified: true,
                    authProvider: 'apple',
                    providerId: profile.id
                });
                await user.save();
            }
            return done(null, user);
        } catch (error) {
            return done(error, null);
        }
    }));

router.post('/apple', passport.authenticate('apple', { session: false }), (req, res) => {
    const token = generateToken(req.user);
    res.json({ token });
});

// ======== Password Reset ========

/**
 * POST /forgot-password
 * Generates an OTP and sends a password reset email.
 */
router.post('/forgot-password', async (req, res) => {
    try {
        const { email } = req.body;
        if (!email) return res.status(400).json({ message: 'Email is required.' });
        const user = await User.findOne({ email });
        if (!user) return res.status(400).json({ message: 'User not found.' });
        const otp = generateOTP();
        user.otp = otp;
        user.otpExpiry = new Date(Date.now() + 10 * 60 * 1000);
        await user.save();

        await transporter.sendMail({
            from: process.env.EMAIL_USER,
            to: email,
            subject: 'Password Reset Code',
            text: `Your password reset code is: ${otp}`
        });
        res.json({ message: 'OTP sent successfully.' });
    } catch (error) {
        console.error('Forgot password error:', error);
        res.status(500).json({ message: 'Internal server error', error: error.message });
    }
});

/**
 * POST /reset-password
 * Resets the user password after validating the OTP.
 */
router.post('/reset-password', async (req, res) => {
    try {
        const { email, otp, password } = req.body;
        if (!email || !otp || !password) {
            return res.status(400).json({ message: 'Email, OTP, and new password are required.' });
        }
        const user = await User.findOne({ email, otp, otpExpiry: { $gt: new Date() } });
        if (!user) {
            return res.status(400).json({ message: 'Invalid or expired OTP.' });
        }
        const hashedPassword = await bcrypt.hash(password, 10);
        user.password = hashedPassword;
        user.otp = undefined;
        user.otpExpiry = undefined;
        await user.save();
        res.json({ message: 'Password reset successful.' });
    } catch (error) {
        console.error('Reset password error:', error);
        res.status(500).json({ message: 'Internal server error', error: error.message });
    }
});

module.exports = router;
