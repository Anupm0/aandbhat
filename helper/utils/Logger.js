const colors = {
    reset: '\x1b[0m',
    bright: '\x1b[1m',
    blue: '\x1b[34m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    red: '\x1b[31m',
    cyan: '\x1b[36m'
};

function logRequest(req) {
    const timestamp = new Date().toISOString();

    console.log('\n' + '='.repeat(80));
    console.log(`${colors.blue}📨 REQUEST${colors.reset} [${timestamp}]`);
    console.log(`${colors.green}METHOD${colors.reset}: ${colors.yellow}${req.method}${colors.reset}`);
    console.log(`${colors.green}URL${colors.reset}: ${colors.yellow}${req.url}${colors.reset}`);
    console.log(`${colors.green}IP${colors.reset}: ${colors.yellow}${req.ip}${colors.reset}`);
    console.log(`${colors.green}HEADERS${colors.reset}:`);
    console.log(`${colors.cyan}${JSON.stringify(req.headers, null, 2)}${colors.reset}`);

    if (['POST', 'PUT', 'PATCH'].includes(req.method)) {
        const sanitizedBody = { ...req.body };
        if (sanitizedBody.password) sanitizedBody.password = '******';
        if (sanitizedBody.otp) sanitizedBody.otp = '******';

        console.log(`${colors.green}BODY${colors.reset}:`);
        console.log(`${colors.cyan}${JSON.stringify(sanitizedBody, null, 2)}${colors.reset}`);
    }
}

function logResponse(req, res) {
    const timestamp = new Date().toISOString();
    const statusColor = res.statusCode < 400 ? colors.green : colors.red;

    console.log(`${colors.blue}📡 RESPONSE${colors.reset} [${timestamp}]`);
    console.log(`${colors.green}STATUS${colors.reset}: ${statusColor}${res.statusCode}${colors.reset}`);
    console.log(`${colors.green}DURATION${colors.reset}: ${colors.yellow}${Date.now() - req._startTime}ms${colors.reset}`);
    console.log('='.repeat(80));
}

module.exports = {
    logRequest,
    logResponse
};