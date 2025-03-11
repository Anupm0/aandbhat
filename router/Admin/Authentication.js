// authentication.js
const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt')
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const transporter = require('../../helper/emailTransporter/EmailTransforter')
const { generateVerificationToken } = require('../../helper/Auth/auth')
const Admin = require('../../modals/Admin'); // Adjust the path to your Admin model file

// Environment variables (set these in your environment or .env file)
const JWT_SECRET = process.env.JWT_SECRET || 'your_jwt_secret';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '15h';
const REFRESH_TOKEN_SECRET = process.env.REFRESH_TOKEN_SECRET || 'your_refresh_secret';
const REFRESH_TOKEN_EXPIRES_IN = process.env.REFRESH_TOKEN_EXPIRES_IN || '30d';

/**
 * Helper: Generate an access token
 */
const generateAccessToken = (admin) => {
    return jwt.sign(
        { id: admin._id, email: admin.email },
        JWT_SECRET,
        { expiresIn: JWT_EXPIRES_IN }
    );
};

/**
 * Helper: Generate a refresh token
 */
const generateRefreshToken = (admin) => {
    return jwt.sign(
        { id: admin._id, email: admin.email },
        REFRESH_TOKEN_SECRET,
        { expiresIn: REFRESH_TOKEN_EXPIRES_IN }
    );
};

/**
 * Middleware: Authenticate using the access token.
 */
const authenticate = (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ message: 'Authorization header missing or malformed' });
    }
    const token = authHeader.split(' ')[1];
    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        req.admin = decoded; // Attach decoded payload (e.g., admin id and email)
        next();
    } catch (error) {
        return res.status(401).json({ message: 'Invalid token' });
    }
};

/**
 * @route   POST /signup
 * @desc    Register a new admin
 */
// router.post('/signup', async (req, res) => {
//     try {
//         const { email, password, username, firstname, lastname, mobile } = req.body;

//         // Check if an admin already exists with the given email or mobile
//         const existingAdmin = await Admin.findOne({ $or: [{ email }, { mobile }, { username }] });
//         if (existingAdmin) {
//             return res.status(400).json({ message: 'Admin with provided email or mobile already exists' });
//         }

//         // Hash password before saving
//         const salt = await bcrypt.genSalt(10);
//         const hashedPassword = await bcrypt.hash(password, salt);

//         const admin = new Admin({
//             email,
//             password: hashedPassword,
//             firstname,
//             lastname,
//             username,
//             verificationToken: generateVerificationToken(),
//             mobile,
//         });

//         const verificationLink = `${req.protocol}://${req.hostname}/api/admin/auth/verify-email?token=${admin?.verificationToken}`;

//         await admin.save();


//         const mailOptions = {
//             from: process.env.EMAIL_USER,
//             to: email,
//             subject: 'Email Confirmation',


//             //nice html and text with css and pleaseing admin to confirm there email

//             html: `
//             <h1>Hi ${firstname},</h1>
//             <p>Thank you for signing up with us. Please click the link below to verify your email address:</p>
//             <a href="${verificationLink}">Verify Email</a>
//             <p>If you did not sign up for this account, please ignore this email.</p>
//             <p>Regards,</p>
//             <p>Drvyy</p>
//             `,

//             text: `Hi ${firstname},\n\nThank you for signing up with us. Please click the link below to verify your email address:\n\n${verificationLink}\n\nIf you did not sign up for this account, please ignore this email.\n\nRegards,\nDrvyy`
//         };

//         await transporter.sendMail(mailOptions, (error, info) => {
//             if (error) {
//                 console.log('Error sending email:', error);

//             } else {
//                 console.log('Email sent:', info.response);

//             }
//         });

//         res.status(201).json({ message: 'Admin created successfully' })
//     } catch (error) {
//         console.error(error);
//         res.status(500).json({ message: 'Server error' });
//     }
// });

/**
 * @route   POST /login
 * @desc    Login admin and return tokens
 */
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        const admin = await Admin.findOne({ email });
        if (!admin) {
            return res.status(400).json({ message: 'Invalid email or password' });
        }

        const isMatch = await bcrypt.compare(password, admin.password);
        if (!isMatch) {
            return res.status(400).json({ message: 'Invalid email or password' });
        }

        // Verify that admin has verified their email
        console.log("ADMIN STATUS", admin.isEmailVerified);
        if (admin.isEmailVerified === false) {
            const verificationLink = `${req.protocol}://${req.hostname}/api/auth/verify-email?token=${admin.verificationToken}`;
            const mailOptions = {
                from: process.env.EMAIL_USER,
                to: email,
                subject: 'Email Confirmation',
                html: `
                    <h1>Hi ${admin.username},</h1>
                    <p>Thank you for signing up with us. Please click the link below to verify your email address:</p>
                    <a href="${verificationLink}">Verify Email</a>
                    <p>If you did not sign up for this account, please ignore this email.</p>
                    <p>Regards,</p>
                    <p>Drvyy</p>
                `,
                text: `Hi ${admin.username},\n\nThank you for signing up with us. Please click the link below to verify your email address:\n\n${verificationLink}\n\nIf you did not sign up for this account, please ignore this email.\n\nRegards,\nDrvyy`
            };

            await transporter.sendMail(mailOptions, (error, info) => {
                if (error) {
                    console.log('Error sending email:', error);
                } else {
                    console.log("Email sent:", info.response);
                }
            });

            return res.status(400).json({ message: 'Please verify your email first' });
        }

        admin.lastLogin = new Date();
        await admin.save();

        const accessToken = generateAccessToken(admin);
        const refreshToken = generateRefreshToken(admin);

        res.status(201).json({ accessToken, refreshToken });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
});

/**
 * @route   POST /refresh-token
 * @desc    Generate a new access token using a refresh token
 */
router.post('/refresh-token', async (req, res) => {
    try {
        const { refreshToken } = req.body;
        if (!refreshToken) {
            return res.status(400).json({ message: 'Refresh token is required' });
        }

        jwt.verify(refreshToken, REFRESH_TOKEN_SECRET, (err, decoded) => {
            if (err) {
                return res.status(401).json({ message: 'Invalid refresh token' });
            }
            const newAccessToken = jwt.sign(
                { id: decoded.id, email: decoded.email },
                JWT_SECRET,
                { expiresIn: JWT_EXPIRES_IN }
            );
            res.status(201).json({ accessToken: newAccessToken });
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
});

/**
 * @route   POST /forgot-password
 * @desc    Generate an OTP for password reset and send it to the admin
 */
router.post('/forgot-password', async (req, res) => {
    try {
        const { email } = req.body;
        const admin = await Admin.findOne({ email });
        if (!admin) {
            return res.status(400).json({ message: 'Admin with this email does not exist' });
        }

        const verificationToken = generateVerificationToken();
        admin.verificationToken = verificationToken;
        const verificationLink = `${req.protocol}://${req.hostname}/api/admin/reset-password?token=${verificationToken}`;
        await admin.save();

        const mailOptions = {
            from: process.env.EMAIL_USER,
            to: email,
            subject: 'Password Reset',
            html: `
                <h1>Hi ${admin.username},</h1>
                <p>Please use the following Link to reset your password:</p>
                <h2>${verificationLink}</h2>
                <p>If you did not request this, please ignore this email.</p>
                <p>Regards,</p>
                <p>Drvyy</p>
            `,
            text: `Hi ${admin.username},\n\nPlease use the following Link to reset your password:\n\n${verificationLink}\n\nIf you did not request this, please ignore this email.\n\nRegards,\nDrvyy`
        };

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
});

/**
 * @route   POST /reset-password
 * @desc    Reset password using the OTP
 */




router.get('/verify-email/:token', async (req, res) => {
    try {
        const token = req.params.token;
        const admin = await Admin.findOne({ verificationToken: token });
        if (!admin) {
            return res.status(400).json({ message: 'Invalid or expired token' });
        }

        admin.isEmailVerified = true;
        admin.verificationToken = null;
        await admin.save();

        res.json({ message: 'Email verified successfully' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
});






router.post('/reset-password', async (req, res) => {
    try {
        const { email, otp, newPassword } = req.body;
        const admin = await Admin.findOne({ email });
        if (!admin) {
            return res.status(400).json({ message: 'Admin with this email does not exist' });
        }
        if (admin.otp !== otp || admin.otpExpiry < new Date()) {
            return res.status(400).json({ message: 'Invalid or expired OTP' });
        }

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(newPassword, salt);
        admin.password = hashedPassword;
        admin.otp = null;
        admin.otpExpiry = null;
        await admin.save();

        res.json({ message: 'Password reset successful' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
});




/**
 * @route   GET /me
 * @desc    Get current admin's profile
 */
router.get('/me', authenticate, async (req, res) => {
    try {
        const admin = await Admin.findById(req.admin.id).select('-password -otp -otpExpiry');
        if (!admin) {
            return res.status(404).json({ message: 'Admin not found' });
        }
        res.json(admin);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
});

module.exports = router;
