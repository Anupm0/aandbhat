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
    isActive: {
        type: Boolean,
        default: true
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
    location: {
        type: {
            type: String,
            enum: ['Point'],
            default: 'Point'
        },
        coordinates: {
            type: [Number],
            default: [0, 0] // Default coordinates (longitude, latitude)
        }
    },
    images: [{
        url: { type: String, required: true },
        filename: { type: String, required: true }
    }]
    ,

    categories: [{ type: mongoose.Schema.Types.ObjectId, ref: 'DriverCategories' }],


    approvalStatus: {
        type: String,
        enum: ['pending', 'approved', 'rejected'],
        default: 'pending'
    },
    backgroundCheckStatus: {
        type: String,
        enum: ['pending', 'verified', 'approved', 'failed'],
        default: 'pending'
    },
    wallet: {
        id: String,
        balance: {
            type: Number,
            default: 0
        },
        logs: [{
            type: {
                type: String,
                enum: ['credit', 'debit']
            },
            amount: Number,
            timestamp: Date
        }]
    },
}, { timestamps: true });

// Function to generate a unique driver ID
function generateDriverId() {
    const prefix = 'DR';
    const random = Math.floor(Math.random() * 100000000).toString().padStart(8, '0');
    return `${prefix}${random}`;
}

// Function to generate a unique wallet ID
async function generateWalletId() {
    const prefix = 'WALLET';
    let random;
    let walletId;
    let walletIdExists;

    do {
        random = Math.floor(Math.random() * 1000000).toString().padStart(6, '0');
        walletId = `${prefix}-${random}`;
        walletIdExists = await Driver.findOne({ 'wallet.id': walletId });
    } while (walletIdExists);

    return walletId;
}

// Pre-save hook to generate driverId if it doesn't exist
driverSchema.pre('save', async function (next) {
    if (!this.driverId) {
        let newDriverId;
        let driverIdExists;
        do {
            newDriverId = generateDriverId();
            driverIdExists = await Driver.findOne({ driverId: newDriverId });
        } while (driverIdExists);
        this.driverId = newDriverId;
    }
    next();
});
driverSchema.index({ location: '2dsphere' });
const Driver = mongoose.model('Driver', driverSchema);

module.exports = Driver;
module.exports.generateWalletId = generateWalletId;