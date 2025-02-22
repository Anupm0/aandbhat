const mongoose = require('mongoose');

const driverSchema = new mongoose.Schema({
    firstName: {
        type: String,
        required: true
    },
    lastName: {
        type: String,
        required: true
    },

    email: {
        type: String,
        unique: true,
        sparse: true
    },
    password: {
        type: String,
        required: true
    },
    mobile: {
        type: String,
        unique: true,
        sparse: true
    },
    address: {
        type: String,
        required: true
    },
    yearsOfExperience: {
        type: Number,
        required: true
    },
    previousCars: [{
        carType: String,
        carModel: String,
        carRegno: String
    }],
    driverId: {
        type: String,
        unique: true,
        required: true
    },
    aadharCardNumber: {
        type: String,
        unique: true,
        required: true
    },
    panCardNumber: {
        type: String,
        unique: true,
        required: true
    },
    licenseNumber: {
        type: String,
        unique: true,
        required: true
    },
    licenseExpiry: {
        type: Date,
        required: true
    },
    bankDetails: {
        accountNumber: {
            type: String,
            required: true
        },
        ifscCode: {
            type: String,
            required: true
        },
        bankName: {
            type: String,
            required: true
        }
    },
    verificationToken: {
        type: String,
        required: false
    },
    isEmailVerified: {
        type: Boolean,
        default: false
    },
    isMobileVerified: {
        type: Boolean,
        default: false
    },
    otp: {
        type: String
    },
    otpExpiry: {
        type: Date
    },
    lastLogin: {
        type: Date
    },
    assignedVehicles: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Vehicle'
    }],
    approvalStatus: {
        type: String,
        enum: ['pending', 'approved', 'rejected'],
        default: 'pending'
    },
    backgroundCheckStatus: {
        type: String,
        enum: ['pending', 'verified', 'failed'],
        default: 'pending'
    }
}, { timestamps: true });

const Driver = mongoose.model('Driver', driverSchema);

module.exports = Driver;
