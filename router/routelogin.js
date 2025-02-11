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
    verificationToken: { type: String },
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


function generateVerificationToken() {
    return crypto.getRandomValues(new Uint32Array(1))[0];
}




// Local Email & Password Registration
router.post('/signup', async (req, res) => {
    try {
        const { email, password, mobile } = req.body;

        // Check if user exists
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({ message: 'Email already registered' });
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        const verificationToken = generateVerificationToken();

        const user = new User({
            email,
            password: hashedPassword,
            mobile: mobile ? `+91${mobile.replace(/\s+/g, '')}` : undefined,
            authProvider: 'local',
            verificationToken
        });

        await user.save();

        // Create verification link
        const verificationLink = `${process.env.API_URL}/api/auth/verify-email/${verificationToken}/${encodeURIComponent(email)}`;

        // Send verification email
        await transporter.sendMail({
            from: process.env.EMAIL_USER,
            to: email,
            subject: 'Verify Your Email',
            html: `
                <h1>Email Verification</h1>
                <p>Please click the link below to verify your email address:</p>
                <a href="${verificationLink}">Verify Email</a>
                <p>This link will expire in 24 hours.</p>
                <p>If you didn't create an account, please ignore this email.</p>
            `
        });

        res.status(201).json({
            message: 'Registration successful. Please check your email to verify your account.'
        });
    } catch (error) {
        res.status(500).json({
            message: 'Error during registration',
            error: error.message
        });
    }
});
// Email verification with OTP
router.get('/verify-email/:token/:email', async (req, res) => {
    try {
        const { token, email } = req.params;

        const user = await User.findOne({
            email: decodeURIComponent(email),
            verificationToken: token,
            isEmailVerified: false
        });

        if (!user) {
            return res.status(400).json({
                message: 'Invalid verification link or email already verified'
            });
        }

        // Update user verification status
        user.isEmailVerified = true;
        user.verificationToken = undefined;
        await user.save();

        // Generate JWT token
        const authToken = generateToken(user);

        // Redirect to frontend with success message
        res.redirect(`${process.env.FRONTEND_URL}/email-verified?token=${authToken}`);
    } catch (error) {
        console.error('Verification error:', error);
        res.status(500).json({
            message: 'Error during email verification',
            error: error.message
        });
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
            const otp = generateOTP();
            user.otp = otp;
            user.otpExpiry = new Date(Date.now() + 10 * 60 * 1000);
            await user.save();

            const accountSid = process.env.TWILIO_ACCOUNT_SID;
            const authToken = process.env.TWILIO_AUTH_TOKEN;
            const client = require('twilio')(accountSid, authToken);

            try {
                // Ensure proper formatting for Indian numbers
                const formattedMobile = mobile.startsWith('+') ? mobile : `+91${mobile}`;

                const message = await client.messages.create({
                    body: `Your verification code is: ${otp}`,
                    from: process.env.TWILIO_PHONE_NUMBER.replace(/\s+/g, ''), // Remove any whitespace
                    to: formattedMobile
                });

                console.log('SMS sent successfully:', message.sid);
                res.json({ message: 'OTP sent successfully' });
            } catch (twilioError) {
                console.error('Twilio error:', twilioError);
                return res.status(500).json({
                    message: 'Error sending SMS',
                    error: twilioError.message,
                    details: `From: ${process.env.TWILIO_PHONE_NUMBER}, To: ${mobile}`
                });
            }
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