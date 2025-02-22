const express = require('express');
const router = express.Router();

const DriverCategory = require('../../modals/DriverCategories');

router.get('/allcategories', async (req, res) => {

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

