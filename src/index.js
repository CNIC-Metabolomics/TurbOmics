// Import modules
const express = require('express');
const fs = require("fs");
const morgan = require('morgan');
const path = require('path');
const cors = require('cors');
const { urlencoded } = require('express');
const os = require('os');

// global objects to control processes
global.processManager = require(path.join(__dirname, './lib/processManager.js'));
global.updateTPMapTable = require(path.join(__dirname, './lib/updateTPMapTable.js'));
global.updateTPMapTable.main();

global.pythonPath = path.join(__dirname, "../env", "bin", "python");
global.pythonPathIntegrate = path.join(__dirname, "../env_pathwayintegrate", "bin", "python");
global.RPath = "Rscript";
global.baseURL = '/TurboPutative';

// Global variables
var app = express();

// Settings
app.set('port', process.env.PORT || 8080);
app.set('trust proxy', true);
global.processManager.MAX_PROCESS = os.cpus().length;


// Middlewares
app.use(cors());

// app.use(morgan('combined'));
app.use(express.json({ limit: '2000mb' }));
app.use(express.urlencoded({ extended: true }));

// Routes
app.use(global.baseURL, require(path.join(__dirname, "routes/index.js")));
app.use(global.baseURL, require(path.join(__dirname, "routes/execute.js")));
app.use(global.baseURL, require(path.join(__dirname, "routes/apiExecute.js")));
app.use(global.baseURL, require(path.join(__dirname, "routes/apiCompounds.js")));
app.use(global.baseURL, require(path.join(__dirname, "routes/viewResults.js")));
app.use(global.baseURL, require(path.join(__dirname, "routes/admin.js")));

// TurboOmics routes
app.get(`${global.baseURL}/TurboOmicsApp.html`, (req, res) => {
    res.redirect(`${global.baseURL}/TurbOmicsApp.html`);
});

app.use(
    `${global.baseURL}/api/tbomics`,
    require(path.join(__dirname, 'TurboOmicsIntegrator/api/router.js'))
);

// Static files
app.use(global.baseURL, express.static(path.join(__dirname, 'public')));
app.use(global.baseURL, express.static(path.join(__dirname, 'TurboOmicsIntegrator/App')));


// Start listening
app.listen(app.get('port'), () => {
    console.log(`TurboPutative web application listening on :${app.get('port')}${global.baseURL}`);
});
