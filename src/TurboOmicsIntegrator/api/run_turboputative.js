// Import libraries
const express = require('express');
const fs = require('fs');
const fsPromises = require('fs').promises;
const path = require('path');
const { spawn } = require('child_process');

const myLogger = require('../scripts/js/myLogger');

// Constants
const router = express.Router();

// Routes

router.post('/post_ann_params/:jobID', async (req, res) => {

    const { jobID } = req.params;
    const annParams = req.body;

    const myPath = path.join(__dirname, `../jobs/${jobID}`);
    const myPathCMM = path.join(myPath, 'CMM_TP');

    const myLogging = myLogger(myPath);

    await new Promise(resolve => fs.writeFile(
        path.join(myPathCMM, 'annParams.json'),
        JSON.stringify(annParams),
        'utf-8',
        () => resolve(0)
    ));

    myLogging('annParams.json was written')
    res.json({ status: 'ok', text: 'annParams.json was written' });
});

router.post('/run_turboputative/:ion_mode/:jobID', async (req, res) => {

    const { jobID, ion_mode } = req.params;
    const resCMM = req.body;

    const myPath = path.join(__dirname, `../jobs/${jobID}`);
    const myPathCMM = path.join(myPath, 'CMM_TP', ion_mode);

    const myLogging = myLogger(myPath);

    // Write CMM result as json
    const cmmFile = `CMM_${ion_mode}`;
    
    await new Promise((resolve) => fs.writeFile(
        path.join(myPathCMM, `${cmmFile}.json`),
        JSON.stringify(resCMM),
        () => resolve(0)
    ));
    
    myLogging(`${cmmFile} received`);
    
    /*
    TurboPutative
    */

    // Create TurboPutative Folder
    const TPFolder = path.join(
        __dirname,
        '../../public/jobs',
        `${jobID}_${ion_mode}`
    );
    
    // Remove if exists
    await fsPromises.rm(TPFolder, { recursive: true, force: true });

    // Create folder (guaranteed before next line)
    await fsPromises.mkdir(TPFolder, { recursive: true });

    // Create timer file
    await fsPromises.writeFile(
        path.join(TPFolder, 'timer'),
        'timer',
        'utf-8'
    );

    // Copy regex.ini file
    fs.copyFileSync(
        path.join(
            __dirname,
            '../../TurboPutative-2.0-built/TPProcesser/REname/data/regex.ini'
        ),
        path.join(TPFolder, 'regex.ini')
    );

    // Copy configUser.ini file (later modified by preTurboPutative)
    fs.copyFileSync(
        path.join(
            __dirname,
            '../../public/assets/files/configUser.ini'
        ),
        path.join(TPFolder, 'configUser.ini')
    );

    // Run preTurboPutative
    params = [
            path.join(__dirname, '../scripts/py/preTurboPutative.py'),
            `--xm=${path.join(myPath, 'EDA/xPreProcessing', 'xm_norm.json')}`,
            `--m2i=${path.join(myPath, 'EDA/xPreProcessing', 'm2i.json')}`,
            `--index=${path.join(myPath, 'EDA/xPreProcessing', 'index.json')}`,
            `--ann=${path.join(myPath, 'CMM_TP', 'annParams.json')}`,
            `--cmm=${path.join(myPathCMM, cmmFile + ".json")}`,
            `--ion_mode=${ion_mode}`,
            `--tpfolder=${TPFolder}`
        ]
        
    myLogging(`** ${global.pythonPath} ${params.join(' ')}`);

    const process = spawn(
        global.pythonPath,
        params,
        { encoding: 'utf-8' }
    )

    process.stdout.on('data', data => fs.appendFileSync(
        path.join(myPathCMM, `${cmmFile}.log`),
        `stdout: ${data}`)
    );

    process.stderr.on('data', data => fs.appendFileSync(
        path.join(myPathCMM, `${cmmFile}.log`),
        `stderr: ${data}`)
    );

    process.on('close', code => {
        if (code == 0) {
            myLogging(`preTurboPutative was executed with ${cmmFile}`);
            
            // Run TurboPutative --> Send job to waiting
            global.processManager.addProcess({
                'IP': req.ip,
                'jobID': `${jobID}_${ion_mode}`,
                'modules': '123456',
                'msTableName': `CMM_${ion_mode}.tsv`,
                'tmTableName': `TM_Table_${ion_mode}.tsv`
            });

        } else {
            myLogging(`Error executing preTurboPutative with ${cmmFile}`);
        }
    })


    // Send response
    res.json({ status: 'ok' });
});

// Export
module.exports = router