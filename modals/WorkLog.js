const mongoose = require('mongoose');

const workLogSchema = new mongoose.Schema({
    driverId: { type: mongoose.Schema.Types.ObjectId, ref: 'Driver', required: true },
    workedFor: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }, // User for whom the driver worked
    date: { type: Date, default: Date.now },
    shiftStartTime: { type: Date }, // Add this if you need to track shift start time
    shuftEndTime: { type: Date }, // Add this if you need to track shift end time
    totalHoursWorked: { type: Number }, // Total hours worked during the shift
    notes: { type: String }, // Any additional notes or comments
    vehicleUsed: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Vehicle', // Reference to the vehicle used (if applicable)
        required: false // Make this false if not always tracking specific vehicles
    },
    incidents: [{ type: String }], // Array of any incidents that occurred during the work period
    location: { type: String } // General location or area of work
}, { timestamps: true });

const WorkLog = mongoose.model('WorkLog', workLogSchema);
module.exports = WorkLog;