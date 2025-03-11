const express = require('express');
const DriverCategory = require('../../modals/DriverCategories');
const Driver = require('../../modals/Driver');
const jwt = require('jsonwebtoken');
const verifyToken = require('../../helper/utils/verifytokenDriver');
const router = express.Router();



router.patch('/activeStatus', verifyToken, async (req, res) => {
    const token = req.header('Authorization');
    console.log();

    if (!token) {
        return res.status(401).json({ message: 'Unauthorized' });
    }

    const user = req.user;
    console.log('user:', user);
    const driver = await Driver.findOne({ driverId: req.user.driverId }).select('-password -otp -providerId -verificationToken  -otpExpiry')

    console.log('driver:', driver);
    if (!driver) {
        return res.status(404).json({ message: 'Driver not found' });
    }

    const driverId = req.user.driverId;
    const { activeStatus } = req.body;
    console.log('activeStatus:', activeStatus);

    try {
        const updatedDriver = await Driver.findOneAndUpdate(
            { driverId },
            { isActive: activeStatus },
            { new: true }
        ).select('-password -otp -providerId -verificationToken  -otpExpiry');

        res.status(201).json(updatedDriver);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Internal Server Error' });
    }
}
);




module.exports = router;