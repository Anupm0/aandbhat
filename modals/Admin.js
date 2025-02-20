const mongoose = require('mongoose');





const AdminSchema = new mongoose.Schema({

    email: {
        type: String,
        unique: true,
        sparse: true
    },

    username: {
        type: String,
        unique: true,
        sparse: true
    },

    password: String,

    firstName: String,
    lastName: String,

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

    createdAt: {
        type: Date,
        default: Date.now
    },
    otp: String,
    otpExpiry: Date,
    lastLogin: Date,

});





module.exports = mongoose.model('Admin', AdminSchema);