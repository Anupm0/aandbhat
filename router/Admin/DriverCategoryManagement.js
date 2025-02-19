const express = require('express');
const router = express.Router();

const DriverCategory = require('../../modals/DriverCategories');

router.get('/', async (req, res) => {
    try {
        const categories = await DriverCategory.find();
        res.json(categories);
    } catch (err) {
        res.status(500).json({ message: 'Something went wrong!' });
    }
});

router.get('/:name', async (req, res) => {
    try {
        const category = await DriverCategory.findOne({ name: req.params.name });
        if (!category) {
            return res.status(404).json({ message: 'Category not found' });
        }
        res.json(category);
    } catch (err) {
        res.status(500).json({ message: 'Something went wrong!' });
    }
});



router.post('/', async (req, res) => {
    const { name, description } = req.body;

    if (!name || !description) {
        return res.status(400).json({ message: 'name and description are required' });
    }

    try {
        const newCategory = new DriverCategory({ name, description });
        await newCategory.save();
        res.json(newCategory);
    } catch (err) {
        res.status(500).json({ message: 'Something went wrong!' });
    }
});





router.put('/:name', async (req, res) => {
    const { name, description } = req.body;
    if (!name || !description) {
        return res.status(400).json({ message: 'name and description are required' });
    }
    try {
        const category = await DriverCategory.findOne({ name: req.params.name });
        if (!category) {
            return res.status(404).json({ message: 'Category not found' });
        }
        category.name = name;
        category.description = description;
        await category.save();
        res.json(category);
    } catch (err) {
        res.status(500).json({ message: 'Something went wrong!' });
    }
});




router.delete('/:name', async (req, res) => {
    try {
        const category = await DriverCategory.findOne({ name: req.params.name });
        if (!category) {
            return res.status(404).json({ message: 'Category not found' });
        }

        await category.remove();
        res.json({ message: 'Category deleted' });
    } catch (err) {
        res.status(500).json({ message: 'Something went wrong!' });
    }
});


module.exports = router;

