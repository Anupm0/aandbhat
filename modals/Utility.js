const mongoose = require('mongoose');

const utilitySchema = new mongoose.Schema({
    // Pricing configuration
    pricing: {
        baseFare: {
            type: Number,
            default: 50, // Base fare in rupees
            required: true
        },
        chargePerHour: {
            type: Number,
            default: 200, // Charge per hour (60 minutes) in rupees
            required: true
        },
        chargePerKm: {
            type: Number,
            default: 15, // Charge per kilometer in rupees
            required: true
        },
        minimumFare: {
            type: Number,
            default: 100, // Minimum fare for any ride
            required: true
        },
        cancellationFee: {
            type: Number,
            default: 50, // Fee for cancellation after driver assignment
            required: true
        },
        waitingChargePerMinute: {
            type: Number,
            default: 2, // Charge for waiting time per minute
            required: true
        }
    },

    // Payment gateway configuration
    paymentGateway: {
        razorpay: {
            keyId: {
                type: String,
                required: true,
                default: ''
            },
            keySecret: {
                type: String,
                required: true,
                default: ''
            },
            active: {
                type: Boolean,
                default: true
            }
        }
    },

    // App configuration
    appConfig: {
        maxWaitingTimeForDriver: {
            type: Number,
            default: 5, // Maximum waiting time in minutes before reassigning
            required: true
        },
        driverSearchRadius: {
            type: Number,
            default: 5, // Radius in kilometers to search for drivers
            required: true
        },
        maxActiveRidesPerDriver: {
            type: Number,
            default: 1,
            required: true
        },
        platformFeePercentage: {
            type: Number,
            default: 10, // Platform fee percentage
            required: true
        }
    },

    // Contact information
    contactInfo: {
        supportEmail: {
            type: String,
            default: 'support@yourdomain.com'
        },
        supportPhone: {
            type: String,
            default: '+91-1234567890'
        },
        officeAddress: {
            type: String,
            default: ''
        }
    },




    SMTP: {
        host: {
            type: String,
            default: ''
        },
        port: {
            type: Number,
            default: 587
        },
        secure: {
            type: Boolean,
            default: false
        },
        auth: {
            user: {
                type: String,
                default: ''
            },
            pass: {
                type: String,
                default: ''
            }
        }
    },

    // Terms and policies (URLs or text)
    legal: {
        termsAndConditions: {
            type: String,
            default: ''
        },
        privacyPolicy: {
            type: String,
            default: ''
        },
        refundPolicy: {
            type: String,
            default: ''
        }
    }
}, {
    timestamps: true
});

// Ensure there's only one document in this collection
utilitySchema.statics.findOneOrCreate = async function () {
    const utility = await this.findOne();
    if (utility) {
        return utility;
    }

    return await this.create({});
};

const Utility = mongoose.model('Utility', utilitySchema);

module.exports = Utility;