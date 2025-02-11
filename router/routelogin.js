// Required dependencies
const express = require('express');
const mongoose = require('mongoose');
const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const AppleStrategy = require('passport-apple');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const nodemailer = require('nodemailer');

const router = express.Router();


const userSchema = new mongoose.Schema({
    email: { type: String, required: true, unique: true },
    password: { type: String },
    mobile: { type: String, unique: true },
    isEmailVerified: { type: Boolean, default: false },
    authProvider: { type: String, enum: ['local', 'google', 'apple'], default: 'local' },
    providerId: String,
    otp: String,
    otpExpiry: Date
});

const User = mongoose.model('User', userSchema);

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';
const JWT_EXPIRES_IN = '7d';

// Email configuration for OTP
const transporter = nodemailer.createTransport({
    host: "smtp.hostinger.com",
    secure: true,
    tls: { ciphers: "SSLv3" },
    requireTLS: true,
    port: 465,
    debug: true,
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
});

// Helper function to generate OTP
function generateOTP() {
    return Math.floor(100000 + Math.random() * 900000).toString();
}

// Helper function to generate JWT token
function generateToken(user) {
    return jwt.sign(
        { userId: user._id, email: user.email },
        JWT_SECRET,
        { expiresIn: JWT_EXPIRES_IN }
    );
}

// Local Email & Password Registration
router.post('/signup', async (req, res) => {
    try {
        const { email, password, mobile } = req.body;

        // Check if user already exists
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({ message: 'Email already registered' });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const user = new User({
            email,
            password: hashedPassword,
            mobile: `+91${mobile}`,
            authProvider: 'local'
        });

        await user.save();

        // Generate and send OTP for email verification
        const otp = generateOTP();
        user.otp = otp;
        user.otpExpiry = new Date(Date.now() + 10 * 60 * 1000); // OTP valid for 10 minutes
        await user.save();

        // Send verification email
        await transporter.sendMail({
            from: process.env.EMAIL_USER,
            to: email,
            subject: 'Email Verification',
            text: `Your verification code is: ${otp}`
        }).then(info => {
            console.log('Email sent:', info.response);
        }).catch(error => {
            console.error('Email error:', error);
            return res.status(500).json({ message: 'Error sending email' });
        });

        res.status(201).json({ message: 'User registered. Please verify your email.' });
    } catch (error) {
        res.status(500).json({ message: 'Error during registration', error: error.message });
    }
});

// Email verification with OTP
router.post('/verify-email', async (req, res) => {
    try {
        const { email, otp } = req.body;
        const user = await User.findOne({
            email,
            otp,
            otpExpiry: { $gt: new Date() }
        });

        if (!user) {
            return res.status(400).json({ message: 'Invalid or expired OTP' });
        }

        user.isEmailVerified = true;
        user.otp = undefined;
        user.otpExpiry = undefined;
        await user.save();

        const token = generateToken(user);
        res.json({ token });
    } catch (error) {
        res.status(500).json({ message: 'Error during verification', error: error.message });
    }
});



router.post('/verify-mobile', async (req, res) => {
    try {
        const { mobile, otp } = req.body;
        const user = await User.findOne({
            mobile,
            otp,
            otpExpiry: { $gt: new Date() }
        });

        if (!user) {
            return res.status(400).json({ message: 'Invalid or expired OTP' });
        }

        user.isMobileVerified = true;
        user.otp = undefined;
        user.otpExpiry = undefined;
        await user.save();

        const token = generateToken(user);
        res.json({ token });
    } catch (error) {
        res.status(500).json({ message: 'Error during verification', error: error.message });
    }
});


//resend OTP
router.post('/resend-otp', async (req, res) => {
    try {
        const { email, mobile } = req.body;
        const user = await User.findOne({
            $or: [{ email }, { mobile }]
        });



        if (!user) {
            return res.status(400).json({ message: 'User not found' });
        }

        if (user.isEmailVerified) {
            return res.status(400).json({ message: 'Email already verified' });
        }

        //check if send otp to mobile or email
        if (mobile && !email) {
            //send otp to mobile number using twilio
            const otp = generateOTP();
            user.otp = otp;
            user.otpExpiry = new Date(Date.now() + 10 * 60 * 1000); // OTP valid for 10 minutes
            await user.save();

            //send otp to mobile number
            console.log('Mobile number:', mobile);

            const accountSid = process.env.TWILIO_ACCOUNT_SID;
            const authToken = process.env.TWILIO_AUTH_TOKEN;
            const client = require('twilio')(accountSid, authToken);
            client.messages
                .create({
                    body: `Your verification code is: ${otp}`,
                    from: process.env.TWILIO_PHONE_NUMBER,
                    to: `+91${mobile}`
                })
                .then(message => console.log(message.sid))
                .catch(error => console.error('Twilio error:', error));
            res.json({ message: 'OTP sent successfully' });



        }

        if (!mobile) {
            const otp = generateOTP();
            user.otp = otp;
            user.otpExpiry = new Date(Date.now() + 10 * 60 * 1000); // OTP valid for 10 minutes
            await user.save();

            // Send verification email

            await transporter.sendMail({
                from: process.env.EMAIL_USER,
                to: email,
                subject: 'Email Verification',
                text: `Your verification code is: ${otp}`
            }).then(info => {
                console.log('Email sent:', info.response);
            }
            ).catch(error => {
                console.error('Email error:', error);
                return res.status(500).json({ message: 'Error sending email' });
            }
            );

            res.json({ message: 'OTP sent successfully' });
        }
    } catch (error) {
        res.status(500).json({ message: 'Error during OTP generation', error: error.message });
    }
});






// Login with email and password
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        const user = await User.findOne({ email });

        if (!user || user.authProvider !== 'local') {
            return res.status(400).json({ message: 'Invalid credentials' });
        }

        const isPasswordValid = await bcrypt.compare(password, user.password);
        if (!isPasswordValid) {
            return res.status(400).json({ message: 'Invalid credentials' });
        }

        if (!user.isEmailVerified) {
            return res.status(400).json({ message: 'Please verify your email first' });
        }

        //generate otp and send to email
        const otp = generateOTP();
        user.otp = otp;
        user.otpExpiry = new Date(Date.now() + 15 * 60 * 1000); // OTP valid for 15 minutes
        await user.save();

        // Send verification email
        await transporter.sendMail({
            from: process.env.EMAIL_USER,
            to: email,
            subject: 'Email Verification',
            text: `Your verification code is: ${otp}`
        }).then(info => {
            console.log('Email sent:', info.response);
        }).catch(error => {
            console.error('Email error:', error);
            return res.status(500).json({ message: 'Error sending email' });
        });



        const token = generateToken(user);
        res.json({ token });
    } catch (error) {
        res.status(500).json({ message: 'Error during login', error: error.message });
    }
});

// Google OAuth Configuration
passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: '/auth/google/callback'
}, async (accessToken, refreshToken, profile, done) => {
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

// Google OAuth Routes
router.get('/google',
    passport.authenticate('google', { scope: ['profile', 'email'] })
);

router.get('/google/callback',
    passport.authenticate('google', { session: false }),
    (req, res) => {
        const token = generateToken(req.user);
        res.redirect(`your-flutter-app-scheme://auth?token=${token}`);
    }
);

// Apple Sign In Configuration
passport.use(new AppleStrategy({
    clientID: process.env.APPLE_CLIENT_ID,
    teamID: process.env.APPLE_TEAM_ID,
    keyID: process.env.APPLE_KEY_ID,
    privateKeyLocation: process.env.APPLE_PRIVATE_KEY_LOCATION,
    callbackURL: '/auth/apple/callback'
}, async (accessToken, refreshToken, profile, done) => {
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

// Apple Sign In Routes
router.post('/apple',
    passport.authenticate('apple', { session: false }),
    (req, res) => {
        const token = generateToken(req.user);
        res.json({ token });
    }
);




router.post('/forgot-password', async (req, res) => {
    try {
        const { email } = req.body;
        const user = await User.findOne({ email });
        // Check if user exists
        if (!user) {
            return res.status(400).json({ message: 'User not found' });
        }
        // Generate OTP
        const otp = generateOTP();
        user.otp = otp;
        user.otpExpiry = new Date(Date.now() + 10 * 60 * 1000); // OTP valid for 10 minutes
        await user.save();
        // Send OTP
        await transporter.sendMail({
            from: process.env.EMAIL_USER,
            to: email,
            subject: 'Password Reset',
            text: `Your password reset code is: ${otp}`
        }).then(info => {
            console.log('Email sent:', info.response);
        }).catch(error => {
            console.error('Email error:', error);
            return res.status(500).json({ message: 'Error sending email' });
        });
        res.json({ message: 'OTP sent successfully' });
    } catch (error) {
        res.status(500).json({ message: 'Error during OTP generation', error: error.message });
    }
});


router.post('/reset-password', async (req, res) => {
    try {
        const { email, otp, password } = req.body;
        const user = await User.findOne({ email, otp, otpExpiry: { $gt: new Date() } });

        if (!user) {
            return res.status(400).json({ message: 'Invalid or expired OTP' });
        }
        const hashedPassword = await bcrypt.hash(password, 10);
        user.password = hashedPassword;
        user.otp = undefined;
        user.otpExpiry = undefined;
        await user.save();
        res.json({ message: 'Password reset successful' });
    } catch (error) {
        res.status(500).json({ message: 'Error during password reset', error: error.message });
    }
});







module.exports = router;