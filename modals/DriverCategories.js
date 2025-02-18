const mongoose = require('mongoose');

const driverCategorySchema = new mongoose.Schema({
    name: {
        type: String,
        required: true
    },
    description: {
        type: String,
        required: true
    }
}, { timestamps: true });

const DriverCategory = mongoose.model('DriverCategory', driverCategorySchema);

module.exports = DriverCategory;

