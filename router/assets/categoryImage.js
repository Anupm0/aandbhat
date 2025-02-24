const express = require("express");
const router = express.Router();
const path = require('path');
const fs = require('fs');

router.get('/api/assets/categoryImage', async (req, res) => {
    const id = decodeURIComponent(req.query.id).replace('/', '');
    console.log(id);
    const isIcon = req.query.isIcon;
    let directoryPath;

    if (isIcon === 'false') {
        directoryPath = path.join(__dirname, '../../assets/categoryImages');
    } else {
        directoryPath = path.join(__dirname, '../../assets/categoryIcons');
    }

    if (!directoryPath) {
        return res.status(400).json({ message: 'Invalid request' });
    }

    fs.readdir(directoryPath, (err, files) => {
        if (err) {
            console.error('Error reading directory:', err);
            return res.status(500).json({ message: 'Server error' });
        }

        const matchingFiles = files.filter(file => file.toLowerCase().includes(id.toLowerCase()));
        if (matchingFiles.length > 0) {
            const imagePath = path.join(directoryPath, matchingFiles[0]);
            console.log(imagePath);
            res.status(200).sendFile(imagePath);
        } else {
            res.status(404).json({ message: 'Image not found' });
        }
    });
});

module.exports = router;