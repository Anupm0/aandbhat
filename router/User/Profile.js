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

router.put('/vehicle/:vehicleId/default', verifyToken, async (req, res) => {
    try {
        const vehicleId = req.params.vehicleId;

        // Fetch the current user document
        const user = await User.findById(req.user._id);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Find the vehicle by ID
        const vehicle = user.vehicles.id(vehicleId);
        if (!vehicle) {
            return res.status(404).json({ message: 'Vehicle not found' });
        }

        // Unset default on all vehicles
        user.vehicles = user.vehicles.map(v => ({ ...v.toObject(), isDefault: false }));

        // Set the selected vehicle as default
        vehicle.isDefault = true;

        // Save the user document
        const updatedUser = await user.save();

        res.status(200).json(updatedUser);
    } catch (error) {
        console.error('Error setting default vehicle:', error);
        res.status(500).json({ message: 'Internal server error' });
    }





    router.get('/profile', verifyToken, async (req, res) => {
        try {
            // Fetch the user document
            const user = await User.findById(req.user._id);
            if (!user) {
                return res.status(404).json({ message: 'User not found' });
            }

            res.json(user);
        } catch (error) {
            console.error('Error fetching user profile:', error);
            res.status(500).json({ message: 'Internal server error' });
        }
    }
    );



});

router.get('/api/me', verifyToken, async (req, res) => {
    try {
        //remove password and otp from user object 
        const user = await User.findById(req.user._id).select('-password -otp -providerId -verificationToken  -otpExpiry');

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }
        res.json(user);
    } catch (error) {
        console.error('Error fetching user profile:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});





module.exports = router;
