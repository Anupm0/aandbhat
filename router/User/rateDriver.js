const express = require('express');
const router = express.Router();
const Rating = require('../../modals/Rating');
const verifyToken = require('../../helper/utils/verifytokenUsers');


router.post('/rate-driver', verifyToken, async (req, res) => {
    try {
        const { driverId, rating, review, rideId } = req.body;
        const passengerId = req.user.userId;
        if (!driverId || !rating) {
            return res.status(400).json({ message: 'Driver ID and rating are required' });
        }

        if (rating < 1 || rating > 5) {
            return res.status(400).json({ message: 'Rating must be between 1 and 5' });
        }

        const newRating = new Rating({
            driverId,
            passengerId,
            rating,
            review,
            rideId
        });

        await newRating.save();
        res.status(201).json({ message: 'Rating submitted successfully' });

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
});

module.exports = router;