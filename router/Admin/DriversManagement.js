const express = require('express');
const router = express.Router();
const Driver = require('../../modals/Driver');
const verifyTokenAdmin = require('../../helper/utils/verifytokenAdmin');

/**
 * GET all drivers
 * Retrieves all drivers with optional filtering
 */
router.get('/', verifyTokenAdmin, async (req, res) => {
    try {
        // Handle optional query parameters for filtering
        const query = {};
        
        // Filter by approval status if provided
        if (req.query.approvalStatus) {
            query.approvalStatus = req.query.approvalStatus;
        }
        
        // Filter by active status if provided
        if (req.query.isActive !== undefined) {
            query.isActive = req.query.isActive === 'true';
        }
        
        // Option to populate vehicle and category references
        const populateOptions = [];
        if (req.query.populate === 'true') {
            populateOptions.push({ path: 'assignedVehicles' });
            populateOptions.push({ path: 'categories' });
        }
        
        // Execute query with pagination
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const skip = (page - 1) * limit;
        
        const drivers = await Driver.find(query)
            .populate(populateOptions)
            .skip(skip)
            .limit(limit)
            .sort({ createdAt: -1 });
            
        const total = await Driver.countDocuments(query);
        
        res.status(200).json({
            message: 'Drivers retrieved successfully',
            data: drivers,
            pagination: {
                total,
                page,
                pages: Math.ceil(total / limit)
            }
        });
    } catch (error) {
        console.error('Error fetching drivers:', error);
        res.status(500).json({
            message: 'Failed to fetch drivers',
            error: error.message
        });
    }
});

/**
 * GET driver by ID
 * Retrieves a specific driver by ID
 */
router.get('/:driverId', verifyTokenAdmin, async (req, res) => {
    try {
        const { driverId } = req.params;
        
        // Option to populate vehicle and category references
        const populateOptions = [];
        if (req.query.populate === 'true') {
            populateOptions.push({ path: 'assignedVehicles' });
            populateOptions.push({ path: 'categories' });
        }
        
        const driver = await Driver.findById(driverId).populate(populateOptions);
        
        if (!driver) {
            return res.status(404).json({
                message: 'Driver not found'
            });
        }
        
        res.status(200).json({
            message: 'Driver retrieved successfully',
            data: driver
        });
    } catch (error) {
        console.error('Error fetching driver:', error);
        res.status(500).json({
            message: 'Failed to fetch driver',
            error: error.message
        });
    }
});

/**
 * POST create driver
 * Creates a new driver
 */
router.post('', verifyTokenAdmin, async (req, res) => {
    try {
        const {
            firstName,
            lastName,
            email,
            password,
            mobile,
            address,
            yearsOfExperience,
            previousCars,
            driverId,
            aadharCardNumber,
            panCardNumber,
            licenseNumber,
            licenseExpiry,
            bankDetails,
            categories,
            approvalStatus,
            backgroundCheckStatus,
            isActive
        } = req.body;
        
        // Check for required fields
        if (!firstName || !lastName || !password || !address || !yearsOfExperience || 
            !driverId || !aadharCardNumber || !panCardNumber || !licenseNumber || 
            !licenseExpiry || !bankDetails) {
            return res.status(400).json({
                message: 'Missing required fields'
            });
        }
        
        // Check if driver with same unique fields already exists
        const existingDriver = await Driver.findOne({
            $or: [
                { email: email },
                { mobile: mobile },
                { driverId: driverId },
                { aadharCardNumber: aadharCardNumber },
                { panCardNumber: panCardNumber },
                { licenseNumber: licenseNumber }
            ]
        });
        
        if (existingDriver) {
            return res.status(400).json({
                message: 'Driver with this email, mobile, driverId, aadharCardNumber, panCardNumber, or licenseNumber already exists'
            });
        }
        
        // Create new driver
        const driver = new Driver({
            firstName,
            lastName,
            email,
            password,
            mobile,
            address,
            yearsOfExperience,
            previousCars: previousCars || [],
            driverId,
            aadharCardNumber,
            panCardNumber,
            licenseNumber,
            licenseExpiry,
            bankDetails,
            categories: categories || [],
            approvalStatus: approvalStatus || 'pending',
            backgroundCheckStatus: backgroundCheckStatus || 'pending',
            isActive: isActive !== undefined ? isActive : true,
            wallet: { id: driverId, balance: 0, logs: [] }
        });
        
        await driver.save();
        
        res.status(201).json({
            message: 'Driver created successfully',
            data: driver
        });
    } catch (error) {
        console.error('Error creating driver:', error);
        res.status(500).json({
            message: 'Failed to create driver',
            error: error.message
        });
    }
});

/**
 * PUT update driver
 * Updates an existing driver
 */
router.put('/:driverId', verifyTokenAdmin, async (req, res) => {
    try {
        const { driverId } = req.params;
        const updateData = req.body;
        
        // Find driver first to check if it exists
        const driver = await Driver.findById(driverId);
        if (!driver) {
            return res.status(404).json({
                message: 'Driver not found'
            });
        }
        
        // Check if unique fields are being updated and if they already exist
        if (updateData.email && updateData.email !== driver.email) {
            const emailExists = await Driver.findOne({ 
                email: updateData.email,
                _id: { $ne: driverId }
            });
            
            if (emailExists) {
                return res.status(400).json({
                    message: 'Email already in use by another driver'
                });
            }
        }
        
        if (updateData.mobile && updateData.mobile !== driver.mobile) {
            const mobileExists = await Driver.findOne({ 
                mobile: updateData.mobile,
                _id: { $ne: driverId }
            });
            
            if (mobileExists) {
                return res.status(400).json({
                    message: 'Mobile already in use by another driver'
                });
            }
        }
        
        // Check for other unique fields
        const uniqueFields = ['driverId', 'aadharCardNumber', 'panCardNumber', 'licenseNumber'];
        for (const field of uniqueFields) {
            if (updateData[field] && updateData[field] !== driver[field]) {
                const exists = await Driver.findOne({ 
                    [field]: updateData[field],
                    _id: { $ne: driverId }
                });
                
                if (exists) {
                    return res.status(400).json({
                        message: `${field} already in use by another driver`
                    });
                }
            }
        }
        
        // Update the driver
        const updatedDriver = await Driver.findByIdAndUpdate(
            driverId,
            { $set: updateData },
            { new: true, runValidators: true }
        );
        
        res.status(200).json({
            message: 'Driver updated successfully',
            data: updatedDriver
        });
    } catch (error) {
        console.error('Error updating driver:', error);
        res.status(500).json({
            message: 'Failed to update driver',
            error: error.message
        });
    }
});

/**
 * PATCH update driver status
 * Updates a driver's approval status or background check status
 */
router.patch('/:driverId/status', verifyTokenAdmin, async (req, res) => {
    try {
        const { driverId } = req.params;
        const { approvalStatus, backgroundCheckStatus, isActive } = req.body;
        
        // Find driver first to check if it exists
        const driver = await Driver.findById(driverId);
        if (!driver) {
            return res.status(404).json({
                message: 'Driver not found'
            });
        }
        
        // Prepare update object
        const updateData = {};
        if (approvalStatus) {
            updateData.approvalStatus = approvalStatus;
        }
        
        if (backgroundCheckStatus) {
            updateData.backgroundCheckStatus = backgroundCheckStatus;
        }
        
        if (isActive !== undefined) {
            updateData.isActive = isActive;
        }
        
        // Update the driver status
        const updatedDriver = await Driver.findByIdAndUpdate(
            driverId,
            { $set: updateData },
            { new: true }
        );
        
        res.status(200).json({
            message: 'Driver status updated successfully',
            data: updatedDriver
        });
    } catch (error) {
        console.error('Error updating driver status:', error);
        res.status(500).json({
            message: 'Failed to update driver status',
            error: error.message
        });
    }
});

/**
 * DELETE driver
 * Deletes a driver
 */
router.delete('/:driverId', verifyTokenAdmin, async (req, res) => {
    try {
        const { driverId } = req.params;
        
        // Find driver first to check if it exists
        const driver = await Driver.findById(driverId);
        if (!driver) {
            return res.status(404).json({
                message: 'Driver not found'
            });
        }
        
        // Delete the driver
        await Driver.findByIdAndDelete(driverId);
        
        res.status(200).json({
            message: 'Driver deleted successfully',
            deletedDriverId: driverId
        });
    } catch (error) {
        console.error('Error deleting driver:', error);
        res.status(500).json({
            message: 'Failed to delete driver',
            error: error.message
        });
    }
});

/**
 * PATCH update driver wallet
 * Updates a driver's wallet balance
 */
router.patch('/:driverId/wallet', verifyTokenAdmin, async (req, res) => {
    try {
        const { driverId } = req.params;
        const { amount, type } = req.body;
        
        if (!amount || !type || !['credit', 'debit'].includes(type)) {
            return res.status(400).json({
                message: 'Valid amount and type (credit/debit) are required'
            });
        }
        
        // Find driver first to check if it exists
        const driver = await Driver.findById(driverId);
        if (!driver) {
            return res.status(404).json({
                message: 'Driver not found'
            });
        }
        
        // For debit transactions, check if there's enough balance
        if (type === 'debit' && driver.wallet.balance < amount) {
            return res.status(400).json({
                message: 'Insufficient wallet balance'
            });
        }
        
        // Update wallet balance
        const newBalance = type === 'credit' 
            ? driver.wallet.balance + amount 
            : driver.wallet.balance - amount;
        
        // Add transaction log
        const logEntry = {
            type,
            amount,
            timestamp: new Date()
        };
        
        // Update the driver's wallet
        const updatedDriver = await Driver.findByIdAndUpdate(
            driverId,
            { 
                $set: { 'wallet.balance': newBalance },
                $push: { 'wallet.logs': logEntry }
            },
            { new: true }
        );
        
        res.status(200).json({
            message: 'Driver wallet updated successfully',
            data: {
                wallet: updatedDriver.wallet
            }
        });
    } catch (error) {
        console.error('Error updating driver wallet:', error);
        res.status(500).json({
            message: 'Failed to update driver wallet',
            error: error.message
        });
    }
});

/**
 * PATCH assign vehicle to driver
 * Assigns a vehicle to a driver
 */
router.patch('/:driverId/assign-vehicle', verifyTokenAdmin, async (req, res) => {
    try {
        const { driverId } = req.params;
        const { vehicleId } = req.body;
        
        if (!vehicleId) {
            return res.status(400).json({
                message: 'Vehicle ID is required'
            });
        }
        
        // Find driver first to check if it exists
        const driver = await Driver.findById(driverId);
        if (!driver) {
            return res.status(404).json({
                message: 'Driver not found'
            });
        }
        
        // Check if vehicle is already assigned to this driver
        if (driver.assignedVehicles.includes(vehicleId)) {
            return res.status(400).json({
                message: 'Vehicle is already assigned to this driver'
            });
        }
        
        // Assign vehicle to driver
        const updatedDriver = await Driver.findByIdAndUpdate(
            driverId,
            { $addToSet: { assignedVehicles: vehicleId } },
            { new: true }
        ).populate('assignedVehicles');
        
        res.status(200).json({
            message: 'Vehicle assigned to driver successfully',
            data: updatedDriver
        });
    } catch (error) {
        console.error('Error assigning vehicle to driver:', error);
        res.status(500).json({
            message: 'Failed to assign vehicle to driver',
            error: error.message
        });
    }
});

/**
 * PATCH remove vehicle from driver
 * Removes a vehicle from a driver
 */
router.patch('/:driverId/remove-vehicle', verifyTokenAdmin, async (req, res) => {
    try {
        const { driverId } = req.params;
        const { vehicleId } = req.body;
        
        if (!vehicleId) {
            return res.status(400).json({
                message: 'Vehicle ID is required'
            });
        }
        
        // Find driver first to check if it exists
        const driver = await Driver.findById(driverId);
        if (!driver) {
            return res.status(404).json({
                message: 'Driver not found'
            });
        }
        
        // Remove vehicle from driver
        const updatedDriver = await Driver.findByIdAndUpdate(
            driverId,
            { $pull: { assignedVehicles: vehicleId } },
            { new: true }
        ).populate('assignedVehicles');
        
        res.status(200).json({
            message: 'Vehicle removed from driver successfully',
            data: updatedDriver
        });
    } catch (error) {
        console.error('Error removing vehicle from driver:', error);
        res.status(500).json({
            message: 'Failed to remove vehicle from driver',
            error: error.message
        });
    }
});

module.exports = router;