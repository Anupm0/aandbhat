const express = require('express');
const router = express.Router();

const DriverCategory = require('../../modals/DriverCategories');
const verifyTokenAdmin = require('../../helper/utils/verifytokenAdmin');

router.get('/dashboard/stats', verifyTokenAdmin, async (req, res) => {

    try {
        const categories = await DriverCategory.find();
        res.status(201).json(categories);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Internal Server Error' });
    }
}

);

module.exports = router;

