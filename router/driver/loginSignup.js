const router = require('express').Router();
const bcrypt = require('bcrypt');
const { generateToken, generateVerificationToken } = require('../../helper/Auth/auth');
const Driver = require('../../modals/Driver');
const { formatMobile } = require('../../helper/format/fomvalidtion');
const transporter = require('../../helper/emailTransporter/EmailTransforter');
const { generateWalletId } = require('../../modals/Driver');
const upload = require('../../helper/upload/uploader');

// Sign-up driver route with dynamic file handling
router.post('/sign-up-driver', upload.any(), async (req, res) => {
    const {
        firstName, lastName, email, phoneNumber, password, address,
        yearsOfExperience, previousCar, aadharCardNumber, panCardNumber,
        licenseNumber, licenseExpiry
    } = req.body;

    console.log('req.files:', req.files);
    console.log('req.body:', req.body);

    const bankDetails = {
        accountNumber: req.body['bankDetails.accountNumber'],
        ifscCode: req.body['bankDetails.ifscCode'],
        bankName: req.body['bankDetails.bankName']
    };

    // Check if at least one file is uploaded
    if (!req.files || req.files.length === 0) {
        return res.status(400).json({ message: 'Please upload at least one file' });
    }

    // Construct an array with file details
    const filesData = req.files.map(file => ({
        url: `/uploads/drivers/${file.filename}`, // adjust this path based on your static serving setup
        filename: file.filename,
        fieldname: file.fieldname
    }));

    // Validate required fields
    if (
        !firstName || !lastName || !email || !phoneNumber || !password ||
        !address || !yearsOfExperience || !previousCar || !aadharCardNumber ||
        !panCardNumber || !licenseNumber || !licenseExpiry ||
        !bankDetails.accountNumber || !bankDetails.ifscCode || !bankDetails.bankName
    ) {
        if (!bankDetails.accountNumber || !bankDetails.ifscCode || !bankDetails.bankName) {
            console.error('Missing required bank details:', bankDetails);
            return res.status(400).json({ message: 'Please enter all bank details' });
        }


        console.error('Missing required fields:', req.body);
        return res.status(400).json({ message: 'Please enter all fields' });
    }

    try {
        const driverExists = await Driver.findOne({ email });
        if (driverExists) {
            return res.status(400).json({ message: 'User already exists' });
        }

        // Generate a unique driverId
        let driverId = 'DR' + Math.floor(Math.random() * 100000000);
        let driverIdExists = await Driver.findOne({ driverId });
        while (driverIdExists) {
            driverId = 'DR' + Math.floor(Math.random() * 100000000);
            driverIdExists = await Driver.findOne({ driverId });
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        const verificationToken = generateVerificationToken();
        const walletId = await generateWalletId();
        const formattedMobile = phoneNumber ? formatMobile(phoneNumber) : undefined;

        const newDriver = new Driver({
            firstName,
            lastName,
            email,
            phoneNumber: formattedMobile,
            password: hashedPassword,
            address,
            yearsOfExperience,
            previousCar,
            aadharCardNumber,
            verificationToken,
            panCardNumber,
            licenseNumber,
            licenseExpiry,
            bankDetails,
            driverId,
            wallet: {
                id: walletId,
                balance: 0,
                logs: []
            },
            // Save all uploaded files in the images array
            images: filesData
        });
        await newDriver.save();

        const verificationLink = `${req.protocol}://${req.hostname}/api/auth/driver/verify-driver-email?token=${verificationToken}`;
        console.log('verificationLink:', verificationLink);

        await transporter.sendMail({
            from: process.env.EMAIL_USER,
            to: email,
            subject: 'Verify Your Email',
            html: `
        <h1>Email Verification For ${firstName} ${lastName}</h1>
        <p>Please click the link below to verify your email address:</p>
        <a href="${verificationLink}">Verify Email</a>
        <p>This link will expire in 24 hours.</p>
        <p>If you did not create an account, please ignore this email.</p>
      `
        });

        res.status(201).json({ message: 'Driver registered successfully. Please verify your email.' });
    } catch (err) {
        console.error(err);
        return res.status(500).json({ message: 'Server Error' });
    }
});

router.get('/verify-driver-email', async (req, res) => {
    const { token: verificationToken } = req.query;
    if (!verificationToken) {
        return res.status(400).json({ message: 'Invalid request' });
    }
    try {
        const driver = await Driver.findOne({ verificationToken });
        if (!driver) {
            return res.status(400).json({ message: 'Invalid driver token' });
        }
        driver.isEmailVerified = true;
        driver.verificationToken = '';
        await driver.save();
        return res.status(201).json({ message: 'Email verified successfully' });
    } catch (err) {
        console.error(err);
        return res.status(500).json({ message: 'Server Error' });
    }
});

router.post('/forgot-password-driver', async (req, res) => {
    const { email } = req.body;
    if (!email) {
        return res.status(400).json({ message: 'Please enter your email' });
    }
    try {
        const driver = await Driver.findOne({ email });
        if (!driver) {
            return res.status(400).json({ message: 'User does not exist' });
        }
        const verificationToken = generateVerificationToken();
        driver.verificationToken = verificationToken;
        await driver.save();
        const resetLink = `${req.protocol}://${req.hostname}/api/auth/driver/reset-password-driver?token=${verificationToken}`;
        console.log('resetLink:', resetLink);
        await transporter.sendMail({
            from: process.env.EMAIL_USER,
            to: email,
            subject: 'Reset Your Password',
            html: `
        <h1>Reset Password</h1>
        <p>Please click the link below to reset your password:</p>
        <a href="${resetLink}">Reset Password</a>
        <p>This link will expire in 24 hours.</p>
        <p>If you did not request a password reset, please ignore this email.</p>
      `
        });

        return res.status(201).json({ message: 'Password reset link sent successfully' });
    } catch (err) {
        console.error(err);
        return res.status(500).json({ message: 'Server Error' });
    }
});

router.get('/reset-password-driver', async (req, res) => {
    const { token } = req.query;
    if (!token) {
        return res.status(400).json({ message: 'Invalid request' });
    }
    try {
        const driver = await Driver.findOne({ verificationToken: token });
        if (!driver) {
            return res.status(400).json({ message: 'Invalid request' });
        }

        const htmlContent = `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Reset Password</title>
        <style>
          body {
            font-family: Arial, sans-serif;
            background-color: #f4f4f4;
            display: flex;
            justify-content: center;
            align-items: center;
            height: 100vh;
            margin: 0;
          }
          .container {
            background-color: #fff;
            padding: 20px;
            border-radius: 8px;
            box-shadow: 0 0 10px rgba(0, 0, 0, 0.1);
            max-width: 400px;
            width: 100%;
          }
          h1 {
            text-align: center;
            color: #333;
          }
          form {
            display: flex;
            flex-direction: column;
          }
          input {
            margin-bottom: 10px;
            padding: 10px;
            border: 1px solid #ccc;
            border-radius: 4px;
          }
          button {
            padding: 10px;
            background-color: #28a745;
            color: #fff;
            border: none;
            border-radius: 4px;
            cursor: pointer;
          }
          button:hover {
            background-color: #218838;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <h1>Reset Password</h1>
          <form action="/api/auth/driver/reset-password-driver" method="POST">
            <input type="hidden" name="token" value="${token}">
            <input type="password" name="newPassword" placeholder="New Password" required>
            <input type="password" name="confirmPassword" placeholder="Confirm Password" required>
            <button type="submit">Reset Password</button>
          </form>
        </div>
      </body>
      </html>
    `;

        res.send(htmlContent);
    } catch (err) {
        console.error(err);
        return res.status(500).json({ message: 'Server Error' });
    }
});

router.post('/reset-password-driver', async (req, res) => {
    const { token, newPassword, confirmPassword } = req.body;
    if (!token || !newPassword || !confirmPassword) {
        return res.status(400).json({ message: 'Please enter all fields' });
    }
    if (newPassword !== confirmPassword) {
        return res.status(400).json({ message: 'Passwords do not match' });
    }
    try {
        console.log('token:', token);
        const driver = await Driver.findOne({ verificationToken: token });
        if (!driver) {
            return res.status(400).json({ message: 'Invalid request' });
        }
        const hashedPassword = await bcrypt.hash(newPassword, 10);
        driver.password = hashedPassword;
        driver.verificationToken = null;
        await driver.save();
        return res.status(201).json({ message: 'Password reset successfully' });
    } catch (err) {
        console.error(err);
        return res.status(500).json({ message: 'Server Error' });
    }
});

router.post('/login-driver-email', async (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) {
        return res.status(400).json({ message: 'Please enter all fields' });
    }
    try {
        const driver = await Driver.findOne({ email }).select('-otp -providerId -verificationToken -otpExpiry');
        if (!driver) {
            return res.status(400).json({ message: 'User does not exist' });
        }
        // Generate a new verification token (if needed) for email verification
        driver.verificationToken = generateVerificationToken();
        await driver.save();

        const verificationLink = `${req.protocol}://${req.hostname}/api/auth/driver/verify-driver-email?token=${driver.verificationToken}`;

        console.log('driver:', driver);

        if (driver.isEmailVerified === false) {
            await transporter.sendMail({
                from: process.env.EMAIL_USER,
                to: email,
                subject: 'Verify Your Email',
                html: `
          <h1>Email Verification For ${driver.firstName} ${driver.lastName}</h1>
          <p>Please click the link below to verify your email address:</p>
          <a href="${verificationLink}">Verify Email</a>
          <p>This link will expire in 24 hours.</p>
          <p>If you did not create an account, please ignore this email.</p>
        `
            });
            console.log('verificationLink:', verificationLink);
            return res.status(400).json({ message: 'Please verify your email' });
        }

        const isMatch = await bcrypt.compare(password, driver.password);
        if (!isMatch) {
            return res.status(400).json({ message: 'Invalid credentials' });
        }

        const token = generateToken(driver);
        return res.status(201).json({ token: token });
    } catch (err) {
        console.error(err);
        return res.status(500).json({ message: 'Server Error' });
    }
});

module.exports = router;
