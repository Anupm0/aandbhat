
const express = require('express');
const mongoose = require('mongoose');
const router = express.Router();
const verifyTokenAdmin = require('../../helper/utils/verifytokenAdmin');

const User = require('../../modals/user');
const Driver = require('../../modals/Driver');
const Admin = require('../../modals/Admin');
const Support = require('../../modals/SupportTicket');


router.get('/support-tickets', verifyTokenAdmin, async (req, res) => {
    try {
        // Pagination parameters
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const skip = (page - 1) * limit;

        // Filter parameters
        const filters = {};
        if (req.query.status) {
            filters.status = req.query.status;
        }
        if (req.query.userId) {
            filters.userId = req.query.userId;
        }
        if (req.query.driverId) {
            filters.driverId = req.query.driverId;
        }

        // Date range filters
        if (req.query.startDate && req.query.endDate) {
            filters.createdAt = {
                $gte: new Date(req.query.startDate),
                $lte: new Date(req.query.endDate)
            };
        }

        // Search filter (searches in messages)
        if (req.query.search) {
            filters.message = { $regex: req.query.search, $options: 'i' };
        }

        // Sort parameters
        const sortField = req.query.sortField || 'createdAt';
        const sortOrder = req.query.sortOrder === 'asc' ? 1 : -1;
        const sort = { [sortField]: sortOrder };

        // Execute query with population
        const tickets = await Support.find(filters)
            .sort(sort)
            .skip(skip)
            .limit(limit)
            .populate('userId', 'firstName lastName email mobile')
            .populate('driverId', 'firstName lastName email mobile driverId')
            .populate('resolvedBy', 'firstName lastName email username');

        // Get total count for pagination
        const totalTickets = await Support.countDocuments(filters);

        // Format response with detailed information
        const formattedTickets = tickets.map(ticket => ({
            id: ticket._id,
            message: ticket.message,
            status: ticket.status,
            createdAt: ticket.createdAt,
            resolveMessage: ticket.resolveMessage,
            user: ticket.userId ? {
                id: ticket.userId._id,
                name: `${ticket.userId.firstName || ''} ${ticket.userId.lastName || ''}`.trim(),
                email: ticket.userId.email,
                mobile: ticket.userId.mobile
            } : null,
            driver: ticket.driverId ? {
                id: ticket.driverId._id,
                driverId: ticket.driverId.driverId,
                name: `${ticket.driverId.firstName || ''} ${ticket.driverId.lastName || ''}`.trim(),
                email: ticket.driverId.email,
                mobile: ticket.driverId.mobile
            } : null,
            resolvedBy: ticket.resolvedBy ? {
                id: ticket.resolvedBy._id,
                name: `${ticket.resolvedBy.firstName || ''} ${ticket.resolvedBy.lastName || ''}`.trim(),
                email: ticket.resolvedBy.email,
                username: ticket.resolvedBy.username
            } : null
        }));

        res.status(200).json({
            tickets: formattedTickets,
            pagination: {
                total: totalTickets,
                page,
                limit,
                pages: Math.ceil(totalTickets / limit)
            }
        });
    } catch (error) {
        console.error('Error fetching support tickets:', error);
        res.status(500).json({
            message: 'Failed to fetch support tickets',
            error: error.message
        });
    }
});

/**
 * GET a specific support ticket by ID
 */
router.get('/support-tickets/:id', verifyTokenAdmin, async (req, res) => {
    try {
        const { id } = req.params;

        // Validate MongoDB ObjectId
        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ message: 'Invalid ticket ID format' });
        }

        const ticket = await Support.findById(id)
            .populate('userId', 'firstName lastName email mobile wallet')
            .populate('driverId', 'firstName lastName email mobile driverId wallet location')
            .populate('resolvedBy', 'firstName lastName email username');

        if (!ticket) {
            return res.status(404).json({ message: 'Support ticket not found' });
        }

        // Detailed response with all related information
        const formattedTicket = {
            id: ticket._id,
            message: ticket.message,
            status: ticket.status,
            createdAt: ticket.createdAt,
            resolveMessage: ticket.resolveMessage,
            user: ticket.userId ? {
                id: ticket.userId._id,
                name: `${ticket.userId.firstName || ''} ${ticket.userId.lastName || ''}`.trim(),
                email: ticket.userId.email,
                mobile: ticket.userId.mobile,
                walletBalance: ticket.userId.wallet?.balance || 0
            } : null,
            driver: ticket.driverId ? {
                id: ticket.driverId._id,
                driverId: ticket.driverId.driverId,
                name: `${ticket.driverId.firstName || ''} ${ticket.driverId.lastName || ''}`.trim(),
                email: ticket.driverId.email,
                mobile: ticket.driverId.mobile,
                walletBalance: ticket.driverId.wallet?.balance || 0,
                location: ticket.driverId.location
            } : null,
            resolvedBy: ticket.resolvedBy ? {
                id: ticket.resolvedBy._id,
                name: `${ticket.resolvedBy.firstName || ''} ${ticket.resolvedBy.lastName || ''}`.trim(),
                email: ticket.resolvedBy.email,
                username: ticket.resolvedBy.username
            } : null
        };

        res.status(200).json(formattedTicket);
    } catch (error) {
        console.error('Error fetching support ticket:', error);
        res.status(500).json({
            message: 'Failed to fetch support ticket',
            error: error.message
        });
    }
});

/**
 * CREATE a new support ticket (typically this would be for user/driver-facing API,
 * but admins might need to create tickets on behalf of users)
 */
router.post('/support-tickets', verifyTokenAdmin, async (req, res) => {
    try {
        const { userId, driverId, message } = req.body;

        // Validate required fields
        if (!userId && !driverId) {
            return res.status(400).json({ message: 'Either userId or driverId is required' });
        }

        if (!message) {
            return res.status(400).json({ message: 'Message is required' });
        }

        // Validate that user or driver exists
        if (userId && !await User.findById(userId)) {
            return res.status(404).json({ message: 'User not found' });
        }

        if (driverId && !await Driver.findById(driverId)) {
            return res.status(404).json({ message: 'Driver not found' });
        }

        // Create new ticket
        const newTicket = new Support({
            userId: userId || null,
            driverId: driverId || null,
            message,
            status: 'open'
        });

        await newTicket.save();

        res.status(201).json({
            message: 'Support ticket created successfully',
            ticket: newTicket
        });
    } catch (error) {
        console.error('Error creating support ticket:', error);
        res.status(500).json({
            message: 'Failed to create support ticket',
            error: error.message
        });
    }
});

/**
 * UPDATE a support ticket (typically for changing status or adding resolution)
 */
router.patch('/support-tickets/:id', verifyTokenAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        const adminId = req.user.id; // From verifyTokenAdmin middleware
        const { status, resolveMessage } = req.body;

        // Validate MongoDB ObjectId
        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ message: 'Invalid ticket ID format' });
        }

        // Find ticket first to ensure it exists
        const ticket = await Support.findById(id);
        if (!ticket) {
            return res.status(404).json({ message: 'Support ticket not found' });
        }

        // Update logic based on status change
        const updates = {};

        if (status) {
            updates.status = status;

            // When resolving, require a resolution message
            if (status === 'resolved' && !resolveMessage) {
                return res.status(400).json({ message: 'Resolution message is required when resolving a ticket' });
            }

            // When status changes to resolved or viewed, set the admin who handled it
            if ((status === 'resolved' || status === 'viewed') && !ticket.resolvedBy) {
                updates.resolvedBy = adminId;
            }
        }

        // Add resolution message if provided
        if (resolveMessage) {
            updates.resolveMessage = resolveMessage;
        }

        // Update the ticket
        const updatedTicket = await Support.findByIdAndUpdate(
            id,
            { $set: updates },
            { new: true }
        )
            .populate('userId', 'firstName lastName email mobile')
            .populate('driverId', 'firstName lastName email mobile driverId')
            .populate('resolvedBy', 'firstName lastName email username');

        res.status(200).json({
            message: 'Support ticket updated successfully',
            ticket: updatedTicket
        });
    } catch (error) {
        console.error('Error updating support ticket:', error);
        res.status(500).json({
            message: 'Failed to update support ticket',
            error: error.message
        });
    }
});

/**
 * DELETE a support ticket
 */
router.delete('/support-tickets/:id', verifyTokenAdmin, async (req, res) => {
    try {
        const { id } = req.params;

        // Validate MongoDB ObjectId
        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ message: 'Invalid ticket ID format' });
        }

        // Check if ticket exists
        const ticket = await Support.findById(id);
        if (!ticket) {
            return res.status(404).json({ message: 'Support ticket not found' });
        }

        // Delete the ticket
        await Support.findByIdAndDelete(id);

        res.status(200).json({
            message: 'Support ticket deleted successfully'
        });
    } catch (error) {
        console.error('Error deleting support ticket:', error);
        res.status(500).json({
            message: 'Failed to delete support ticket',
            error: error.message
        });
    }
});

/**
 * GET statistics about support tickets
 */
router.get('/support-tickets-stats', verifyTokenAdmin, async (req, res) => {
    try {
        const totalTickets = await Support.countDocuments();
        const openTickets = await Support.countDocuments({ status: 'open' });
        const viewedTickets = await Support.countDocuments({ status: 'viewed' });
        const resolvedTickets = await Support.countDocuments({ status: 'resolved' });

        // Last 7 days statistics
        const last7Days = new Date();
        last7Days.setDate(last7Days.getDate() - 7);
        const newTicketsLast7Days = await Support.countDocuments({ createdAt: { $gte: last7Days } });
        const resolvedTicketsLast7Days = await Support.countDocuments({
            status: 'resolved',
            createdAt: { $gte: last7Days }
        });

        res.status(200).json({
            totalTickets,
            openTickets,
            viewedTickets,
            resolvedTickets,
            resolutionRate: totalTickets > 0 ? ((resolvedTickets / totalTickets) * 100).toFixed(2) + '%' : '0%',
            last7Days: {
                newTickets: newTicketsLast7Days,
                resolvedTickets: resolvedTicketsLast7Days
            }
        });
    } catch (error) {
        console.error('Error fetching support ticket statistics:', error);
        res.status(500).json({
            message: 'Failed to fetch support ticket statistics',
            error: error.message
        });
    }
});

module.exports = router;