
function formatMobile(mobile) {
    try {
        if (!mobile) {
            return {
                isValid: false,
                value: null,
                error: 'Mobile number is required'
            };
        }

        // Remove all spaces and special characters except +
        const cleaned = mobile.replace(/[^\d+]/g, '');

        // Check if it's a valid Indian mobile number
        const indianMobileRegex = /^(\+91)?[6-9]\d{9}$/;

        // Add +91 prefix if not present
        const formattedNumber = cleaned.startsWith('+91') ? cleaned : `+91${cleaned}`;

        if (!indianMobileRegex.test(formattedNumber)) {
            return {
                isValid: false,
                value: formattedNumber,
                error: 'Invalid Indian mobile number. Must be 10 digits starting with 6-9'
            };
        }

        return {
            isValid: true,
            value: formattedNumber,
            error: null
        };
    } catch (error) {
        return {
            isValid: false,
            value: null,
            error: 'Invalid mobile number format'
        };
    }
}


function formatEmail(email) {
    try {
        if (!email) {
            return {
                isValid: false,
                value: null,
                error: 'Email is required'
            };
        }

        // Remove all whitespace
        const cleaned = email.trim().toLowerCase();

        // RFC 5322 Official Standard Email Regex
        const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;

        if (!emailRegex.test(cleaned)) {
            return {
                isValid: false,
                value: cleaned,
                error: 'Invalid email format'
            };
        }

        // Additional validations
        const [localPart, domain] = cleaned.split('@');

        if (cleaned.length > 254 || localPart.length > 64) {
            return {
                isValid: false,
                value: cleaned,
                error: 'Email address is too long'
            };
        }

        return {
            isValid: true,
            value: cleaned,
            error: null
        };
    } catch (error) {
        return {
            isValid: false,
            value: null,
            error: 'Invalid email format'
        };
    }
}

function isValidName(str) {
    if (!str) return false;
    return /^[A-Za-z\s]{1,50}$/.test(str.trim());
}

module.exports = {
    formatMobile,
    formatEmail,
    isValidName
};