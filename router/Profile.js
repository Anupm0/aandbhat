const express = require('express');

const router = express.Router();

router.get('/profile', (req, res) => {
    res.send('Profile page');
});



router.get('/profile/:id', (req, res) => {
    res.send(`Profile page of user ${req.params.id}`);
});




module.exports = router;