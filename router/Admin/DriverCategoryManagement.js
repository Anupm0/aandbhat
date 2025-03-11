const express = require('express');
const router = express.Router();

const DriverCategory = require('../../modals/DriverCategories');

const verifyTokenAdmin = require('../../helper/utils/verifytokenAdmin');





router.get('/categories', async (req, res) => {
    try {
        const categories = await DriverCategory.find();
        res.status(201).json(categories);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Internal Server Error' });
    }
});


router.post('/add-category', verifyTokenAdmin, async (req, res) => {
    const { name, description } = req.body;
    try {
        if (!name || !description) {
            return res.status(400).json({ message: 'All fields are required' });
        }

        const category = await DriverCategory.findOne({ name });
        if (category) {
            return res.status(400).json({ message: 'Category already exists' });
        }

        const newCategory = new DriverCategory({
            name,
            description
        });

        await newCategory.save();
        res.status(201).json({ message: 'Category added successfully' });

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
});



router.patch('/update-category/:categoryId', verifyTokenAdmin, async (req, res) => {
    const { name, description } = req.body;
    const { categoryId } = req.params;
    try {
        if (!name || !description) {
            return res.status(400).json({ message: 'All fields are required' });
        }

        const category = await DriverCategory.findById(categoryId);
        if (!category) {
            return res.status(404).json({ message: 'Category not found' });
        }

        category.name = name;
        category.description = description;

        await category.save();
        res.status(201).json({ message: 'Category updated successfully' });

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
});



router.delete('/delete-category/:categoryId', verifyTokenAdmin, async (req, res) => {
    const { categoryId } = req.params;
    try {
        const category = await DriverCategory.findById(categoryId);
        if (!category) {
            return res.status(404).json({ message: 'Category not found' });
        }

        await category.remove();
        res.status(201).json({ message: 'Category deleted successfully' });

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
}
);


module.exports = router;

