
function formatMobile(mobile) {
    try {
        if (!mobile) {
            throw new Error('Mobile number is required');
        }

        // Remove all spaces and special characters except +
        const cleaned = mobile.replace(/[^\d+]/g, '');

        // Check if it's a valid Indian mobile number
        const indianMobileRegex = /^(\+91)?[6-9]\d{9}$/;

        // Add +91 prefix if not present
        const formattedNumber = cleaned.startsWith('+91') ? cleaned : `+91${cleaned}`;

        if (!indianMobileRegex.test(formattedNumber)) {
            throw new Error('Invalid Indian mobile number. Must be 10 digits starting with 6-9');
        }

        return formattedNumber;
    } catch (error) {
        throw new Error(error.message || 'Invalid mobile number format');
    }
}

function formatEmail(email) {
    try {
        if (!email) {
            throw new Error('Email is required');
        }


        const cleaned = email.trim().toLowerCase();

        // RFC 5322 Official Standard Email Regex
        const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;

        if (!emailRegex.test(cleaned)) {
            throw new Error('Invalid email format');
        }

        // Additional validations
        const [localPart, domain] = cleaned.split('@');

        if (cleaned.length > 254 || localPart.length > 64) {
            throw new Error('Email address is too long');
        }

        return cleaned;
    } catch (error) {
        throw new Error(error.message || 'Invalid email format');
    }
}

function isValidName(str) {
    if (!str || !/^[A-Za-z\s]{1,50}$/.test(str.trim())) {
        throw new Error('Invalid name format. Use only letters and spaces, max 50 characters');
    }
    return str.trim();
}

module.exports = {
    formatMobile,
    formatEmail,
    isValidName
};