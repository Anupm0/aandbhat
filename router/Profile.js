const express = require('express');
const { Mongoose } = require('mongoose');
const mongoose = require('mongoose');


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



router.post('/addvehicle', (req, res) => {
    const { carType, carModel, carRegno, carColor, isDefault } = req.body;
    const vehicle = {
        carType,
        carModel,
        carRegno,
        carColor,
        isDefault
    };
    mongoose.model('User').findOneAndUpdate({ _id: req.user._id }, { $push: { vehicles: vehicle } }, { new: true }, (err, data) => {
        if (err) {
            res.status(500).json({ message: 'Something went wrong!' });
        } else {
            res.status(201).json(data);
        }
    });
});




router.get('/profile/:id', (req, res) => {
    res.send(`Profile page of user ${req.params.id}`);
});




module.exports = router;