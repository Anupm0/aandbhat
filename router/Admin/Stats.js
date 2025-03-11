const express = require('express');
const verifyTokenAdmin = require('../../helper/utils/verifytokenAdmin');
const User = require('../../modals/user');
const Driver = require('../../modals/Driver');
const Booking = require('../../modals/booking');
const router = express.Router();



router.get('/dashboard-stats-card', verifyTokenAdmin, async (req, res) => {
    try {
        //find all users count in user collection
        const usersCount = await User.countDocuments();
        //find all driver count in user collection
        const driverCount = await Driver.countDocuments();
        //find total rides count in booking collection
        const totalRides = await Booking.countDocuments();
        //find total number of 


        //find total amount in booking collection
        const totalAmount = await Booking.aggregate([
            {
                $group: {
                    _id: null,
                    totalAmount: { $sum: "$fare" }
                }
            }
        ]);

        res.status(200).json({
            usersCount,
            driverCount,
            totalRides,
            totalAmount: totalAmount[0].totalAmount
        });

    }
    catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
}
);

module.exports = router;

