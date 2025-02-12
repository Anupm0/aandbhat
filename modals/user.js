const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    name: String,
    email: {
        type: String,
        unique: true,
        sparse: true
    },
    password: String,
    mobile: {
        type: String,
        unique: true,
        sparse: true
    },
    isEmailVerified: {
        type: Boolean,
        default: false
    },
    isMobileVerified: {
        type: Boolean,
        default: false
    },
    verificationToken: String,
    authProvider: {
        type: String,
        enum: ['local', 'google', 'apple'],
        default: 'local'
    },
    providerId: String,
    otp: String,
    otpExpiry: Date,
    resendAttempts: {
        type: Number,
        default: 0
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
    role: {
        type: String,
        default: 'user'
    },
    vehicles: [{
        carType: {
            type: String,
            required: true
        },
        carModel: {
            type: String,
            required: true
        },
        carRegno: {
            type: String,
            required: true
        },
        carColor: String,
        isDefault: {
            type: Boolean,
            default: false
        },
        addedAt: {
            type: Date,
            default: Date.now
        }
    }],
    address: String
}, {
    timestamps: true
});

userSchema.index({ 'vehicles.carRegno': 1 });


userSchema.pre('save', async function (next) {
    if (!this.wallet.id) {
        this.wallet.id = generateWalletId();
    }


    if (this.vehicles && this.vehicles.length > 0) {
        const hasDefault = this.vehicles.some(v => v.isDefault);
        if (!hasDefault) {
            this.vehicles[0].isDefault = true;
        }
    }


    next();
});


userSchema.methods.setDefaultVehicle = async function (carRegno) {
    this.vehicles.forEach(vehicle => {
        vehicle.isDefault = vehicle.carRegno === carRegno;
    });
    return this.save();
};




const User = mongoose.model('User', userSchema);

module.exports = User;




const generateWalletId = () => {
    const prefix = 'WALLET';
    const random = Math.floor(Math.random() * 1000000).toString().padStart(6, '0');
    return `${prefix}-${random}`;
};
