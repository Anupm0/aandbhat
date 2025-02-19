const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
    // host: process.env.EMAIL_HOST || "smtp.hostinger.com",
    host: 'smtp.zoho.in',
    port: 465,
    secure: true,
    // port: Number(process.env.EMAIL_PORT) || 465,
    // secure: true,
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    },
    tls: {
        ciphers: 'SSLv3'
    }
})

const verify = async () => {
    try {
        await transporter.verify();
        console.log('Connected to email server');
    } catch (err) {
        console.error('Error connecting to email server', err);
    }
}

verify();


module.exports = transporter;