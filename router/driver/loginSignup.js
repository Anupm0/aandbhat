const router = require('express').Router();

const { generateToken } = require('../../helper/Auth/auth');
const Driver = require('../../modals/Driver');
const User = require('../../modals/user');






router.post('/sign-up-driver', async (req, res) => {
    const { firstName, lastName, email, mobile, password, address, yearsOfExperience, previousCar, aadharCardNumber, panCardNumber, licenseNumber, licenseExpiry, bankDetails } = req.body;

    if (!firstName || !lastName || !email || !mobile || !password || !address || !yearsOfExperience || !previousCar || !aadharCardNumber || !panCardNumber || !licenseNumber || !licenseExpiry || !bankDetails) {
        return res.status(400).json({ message: 'Please enter all fields' });
    }

    try {
        const driver = await Driver.findOne
            ({ email });
        if (driver) {
            return res.status(400).json({ message: 'User already exists' });
        }
        let driverId = 'DR' + Math.floor(Math.random() * 100000000);

        //verify if the driverId is unique
        const driverIdExists = await Driver.findOne({ driverId });
        if (driverIdExists) {
            //re generate driverId
            driverId = 'DR' + Math.floor(Math.random() * 100000000);
        }


        const newDriver = new Driver({
            firstName,
            lastName,
            email,
            mobile,
            password,
            address,
            yearsOfExperience,
            previousCar,
            aadharCardNumber,
            panCardNumber,
            licenseNumber,
            licenseExpiry,
            driverId,
            bankDetails
        });
        await newDriver.save();
        const token = generateToken(newDriver);
        return res.status(201).json({ token: token });
    }
    catch (err) {
        return res.status(500).json({ message: 'Server Error' });
    }
})







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



module.exports = router;