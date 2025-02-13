const express = require('express');
const { Mongoose } = require('mongoose');
const mongoose = require('mongoose');
const verifyToken = require('../../helper/utils/verifytoken');
const User = require('../../modals/user');

const router = express.Router();

// router.get('/allusers/:number?', (req, res) => {
//     if (req.params.number) {
//         mongoose.model('User').find({}).limit(parseInt(req.params.number)).exec((err, data) => {
//             if (err) {
//                 res.status(500).json({ message: 'Something went wrong!' });
//             } else {
//                 res.json(data);
//             }
//         }
//         );

//     } else {
//         res.send('All users');
//     }
// });


router.post('/addvehicle', verifyToken, async (req, res) => {
    try {
        const { carType, carModel, carRegno, carColor, isDefault } = req.body;

        // Validate required fields
        if (!carType || !carModel || !carRegno) {
            return res.status(400).json({ message: 'carType, carModel, and carRegno are required' });
        }

        // Construct the vehicle object
        const vehicle = {
            carType,
            carModel,
            carRegno,
            carColor: carColor || null,
            isDefault: Boolean(isDefault)
        };

        // Fetch the current user document
        const user = await User.findById(req.user._id);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        // If the new vehicle is set to default, unset default on all existing vehicles
        if (vehicle.isDefault) {
            user.vehicles = user.vehicles.map(v => ({ ...v.toObject(), isDefault: false }));
        }

        // Push the new vehicle
        user.vehicles.push(vehicle);

        // Save the user document (the pre-save hook will ensure a default if none exists)
        const updatedUser = await user.save();

        res.status(201).json(updatedUser);
    } catch (error) {
        console.error('Error adding vehicle:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});

module.exports = router;
