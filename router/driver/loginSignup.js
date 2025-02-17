const router = require('express').Router();

const { generateToken } = require('../../helper/Auth/auth');
const Driver = require('../../modals/Driver');
const User = require('../../modals/user');


router.post('/login-driver-email', async (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) {
        return res.status(400).json({ message: 'Please enter all fields' });
    }
    try {
        const driver = await Driver.findOne({ email });
        if (!driver) {
            return res.status(400).json({ message: 'User does not exist' });
        }

        if (password !== driver.password) {
            return res.status(400).json({ message: 'Invalid credentials' });
        }

        const token = generateToken(driver);
        return res.status(201).json({ token: token });


    }
    catch (err) {
        return res.status(500).json({ message: 'Server Error' });
    }

});