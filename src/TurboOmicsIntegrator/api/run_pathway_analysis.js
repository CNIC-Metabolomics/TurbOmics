// Import modules
const fs = require('fs');
const path = require('path');
const { Router } = require('express');
const { spawn } = require("child_process");

// Constants
const router = Router();

const VIEW = {
    'Single-View': 'SV',
    'Multi-View': 'MV'
}

// Routes
router.post('/run_pathway_analysis/:jobID/:runId', async (req, res) => {

    // set vars
    const jobID = req.params.jobID;
    const view = VIEW[req.body.view];
    const runId = req.params.runId;
    const omics = Object.keys(req.body.f2id).filter(key => req.body.f2id[key]);

    // Set paths
    const myPathBase = path.join(__dirname, '../jobs', jobID)
    const myPath = path.join(myPathBase, 'PWA', view, runId.toString());
    const myPathX = path.join(myPathBase, 'EDA/xPreProcessing');
    const myPathPI = path.join(__dirname, '../scripts/py/PathIntegrate');


    // Check if folder exist
    const fileExists = async path => !!(await fs.promises.stat(path).catch(e => false));
    if (await fileExists(myPath)) {
        res.json({ status: 'Job exist', runId: runId });
        return;
    }

    // Create working folder
    await new Promise(resolve => {
        fs.mkdir(myPath, {}, () => resolve(0))
    });

    // Write f2id
    await new Promise(r => {
        Promise.all(omics.map(o => {
            return new Promise(r => {
                fs.writeFile(
                    path.join(myPath, `${o}2id.json`),
                    JSON.stringify(req.body.f2id[o]),
                    () => r(0)
                );

            })
        })).then((e) => r(0))
    });

    // Set db reactome file
    const _files = await new Promise(res => fs.readdir(path.join(myPathPI, 'Reactome_db'), (err, files) => res(files)));
    const _gmtArr = _files.filter(e => e.includes(req.body.OS));
    let gmt = _gmtArr.length > 0 ? _gmtArr[0] : 'Reactome_Homo_sapiens_pathways_multiomics_R89.gmt';
    gmt = path.join(myPathPI, 'Reactome_db', gmt);

    //let gmt = path.join(myPathPI, 'Reactome_db', `Reactome_${req.body.OS}_pathways_multiomics_R89.gmt`);
    //gmt = await fileExists(gmt) ? gmt : path.join(myPathPI, 'Reactome_db', `Reactome_Homo_sapiens_pathways_multiomics_R89.gmt`);

    // Create and write params.json
    const params = {
        "mdata": path.join(myPathX, 'mdata.json'),
        "col": req.body.col,
        "type": req.body.type,
        "val1": req.body.val1,
        "val2": req.body.val2,
        "xi": omics.reduce(
            (prev, curr) => ({ ...prev, [curr]: path.join(myPathX, `x${curr}_norm.json`) }), {}
        ),
        "f2id": omics.reduce(
            (prev, curr) => ({ ...prev, [curr]: path.join(myPath, `${curr}2id.json`) }), {}
        ),
        "index": path.join(myPathX, 'index.json'),
        "gmt": gmt,
        "n_components": 5,
        "output": myPath
    }
    await new Promise(r => {
        fs.writeFile(
            path.join(myPath, 'params.json'),
            JSON.stringify(params),
            () => r(0)
        );
    });

    // Run PathIntegrate
    const scriptPath = path.join(myPathPI, `PathIntegrate_${view}.py`);
    const paramsPath = path.join(myPath, 'params.json');
    const cmd = `${global.pythonPath} ${scriptPath} --params=${paramsPath}`;
    console.log(`** ${cmd}`);
    const process = spawn(
        global.pythonPath,
        [
            scriptPath,
            `--params=${paramsPath}`
        ]
    );
    const errorLogPath = path.join(myPath, 'error.log');
    const runLogPath = path.join(myPath, '.log');
    let stderrBuffer = '';
    let stdoutBuffer = '';
    process.on('error', err => {
        console.error('Failed to start PathIntegrate:', err);
        fs.appendFileSync(runLogPath, `stderr: ${err.code}:${err.message}`);
    });
    process.stdout.on('data', data => {
        const msg = data.toString();
        stdoutBuffer += msg;
        fs.appendFileSync(runLogPath, `stdout: ${msg}`);
    });
    process.stderr.on('data', data => {
        const msg = data.toString();
        stderrBuffer += msg;
        fs.appendFileSync(runLogPath, `stderr: ${msg}`);
    });
    process.on('close', exitCode => {
        if (exitCode === 0) {
            console.log('PathIntegrate executed successfully');
            return;
        }
        const errorPayload = {
            status: 'error',
            code: exitCode,
            message: stderrBuffer.trim() || 'Process exited with error but no stderr output',
            timestamp: new Date().toISOString()
        };
        fs.writeFileSync(errorLogPath, JSON.stringify(errorPayload, null, 2));
    });

    // Send response
    res.json({ status: 'Job sent', runId: runId });

});

// Export
module.exports = router;