const express = require('express');

const Driver = require('../../modals/Driver')
const router = express.Router();

router.get('/me', async (req, res) => {
    const token = req.header('Authorization');
    if (!token) {
        return res.status(401).json({ message: 'Unauthorized' });
    }

    const driver = await Driver.findOne({ token }).select('-password -otp -providerId -verificationToken  -otpExpiry')
    if (!driver) {
        return res.status(404).json({ message: 'Driver not found' });
    }

    res.status(201).json(driver);



});

module.exports = router;