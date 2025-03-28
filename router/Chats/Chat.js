const express = require('express');
const router = express.Router();
const Message = require('../../modals/MessageSchema');
const verifyTokenAdmin = require('../../helper/utils/verifytokenAdmin');

router.post('/chat', async (req, res) => {
    try {
        let { conversationId, senderId, senderType, receiverId, receiverType, text } = req.body;
        if (!conversationId || !senderId || !senderType || !receiverId || !receiverType || !text) {
            return res.status(400).json({ error: 'Missing required fields' });
        }
        // Validate ObjectId format
        if (
            !mongoose.Types.ObjectId.isValid(conversationId) ||
            !mongoose.Types.ObjectId.isValid(senderId) ||
            !mongoose.Types.ObjectId.isValid(receiverId)
        ) {
            return res.status(400).json({ error: 'Invalid ObjectId format for conversationId, senderId, or receiverId' });
        }
        const message = new Message({
            bookingId: mongoose.Types.ObjectId(conversationId),
            senderId: mongoose.Types.ObjectId(senderId),
            senderType,
            receiverId: mongoose.Types.ObjectId(receiverId),
            receiverType,
            text,
            read: false
        });
        await message.save();
        return res.status(201).json(message);
    } catch (error) {
        console.error(error);
        return res.status(500).json({ error: 'Internal Server Error' });
    }
});


router.get('/chat', async (req, res) => {
    try {
        const { conversationId, userId } = req.query;
        if (!conversationId || !userId) {
            return res.status(400).json({ error: 'Missing conversationId or userId' });
        }
        const messages = await Message.find({
            bookingId: conversationId,
            $or: [{ senderId: userId }, { receiverId: userId }]
        }).sort({ createdAt: 1 });
        // Mark messages as read when the receiver retrieves them
        await Message.updateMany(
            { bookingId: conversationId, receiverId: userId, read: false },
            { $set: { read: true } }
        );
        return res.status(200).json(messages);
    } catch (error) {
        return res.status(500).json({ error: 'Internal Server Error' });
    }
});

router.post('/chat/markread', async (req, res) => {
    try {
        const { conversationId, userId } = req.body;
        if (!conversationId || !userId) {
            return res.status(400).json({ error: 'Missing conversationId or userId' });
        }
        await Message.updateMany(
            { bookingId: conversationId, receiverId: userId, read: false },
            { $set: { read: true } }
        );
        return res.status(200).json({ success: true });
    } catch (error) {
        return res.status(500).json({ error: 'Internal Server Error' });
    }
});

router.initializeSocket = (io) => {
    io.on('connection', (socket) => {
        // Use a unified event name for joining the conversation room
        socket.on('joinConversation', (conversationId) => {
            socket.join(conversationId);
            console.log(`Socket ${socket.id} joined conversation ${conversationId}`);
        });
        socket.on('sendMessage', async (data) => {
            try {
                const { conversationId, senderId, senderType, receiverId, receiverType, text } = data;
                if (!conversationId || !senderId || !senderType || !receiverId || !receiverType || !text) {
                    return socket.emit('error', { message: 'Missing required fields' });
                }
                const message = new Message({
                    bookingId: conversationId,
                    senderId,
                    senderType,
                    receiverId,
                    receiverType,
                    text,
                    read: false
                });
                await message.save();
                io.to(conversationId).emit('newMessage', message);
            } catch (error) {
                console.error('Error sending message:', error);
                socket.emit('error', { message: 'Error sending message' });
            }
        });
    });
};








router.get('/chat/admin', verifyTokenAdmin, async (req, res) => {
    try {
        const { conversationId } = req.query;
        if (!conversationId) {
            return res.status(400).json({ error: 'Missing conversationId' });
        }
        const messages = await Message.find({ bookingId: conversationId }).sort({ createdAt: 1 });
        return res.status(200).json(messages);
    } catch (error) {
        return res.status(500).json({ error: 'Internal Server Error' });
    }
}
);



module.exports = router;
