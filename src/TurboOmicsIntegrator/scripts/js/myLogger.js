const fs = require('fs');
const path = require('path');

function myLogger (myPath) {
    const myLogging = msg => {
        console.log(msg);
        let log = `${new Date().toISOString().replace(/[TZ]/g, ' - ')}${msg}\n`;
        fs.appendFileSync(
            path.join(myPath, '.log'),
            log
        );
    }
    return myLogging
}

module.exports = myLogger;