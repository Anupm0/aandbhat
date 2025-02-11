const express = require('express');
const { Mongoose } = require('mongoose');
const mongoose = require('mongoose');


const router = express.Router();

router.get('/allusers/:number?', (req, res) => {
    if (req.params.number) {
        mongoose.model('User').find({}).limit(parseInt(req.params.number)).exec((err, data) => {
            if (err) {
                res.status(500).json({ message: 'Something went wrong!' });
            } else {
                res.json(data);
            }
        }
        );

    } else {
        res.send('All users');
    }
});



router.get('/profile/:id', (req, res) => {
    res.send(`Profile page of user ${req.params.id}`);
});




module.exports = router;