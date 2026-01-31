// Import libraries
const express = require('express');
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const myLogger = require('../scripts/js/myLogger');

// Constants
const router = express.Router();

// Define routes
router.get('/get_turboputative/:jobID/:ion_mode', async (req, res) => {

    const { jobID, ion_mode } = req.params;

    const myPath = path.join(__dirname, '../jobs', jobID, 'EDA/xPreProcessing');
    const myLogging = myLogger(path.join(myPath, '../..'))

    myLogging(`Get TurboPutative results: id=${jobID}, ionMode=${ion_mode}`);


    // Check status
    const status = ion_mode.split('_').map(mode => {
        const TPFolder = path.join(
            __dirname,
            `../../public/jobs/${jobID}_${mode}`
        );

        let status = 'waiting';
        console.log( path.join(TPFolder, 'TurboPutative_results.zip') );
        console.log( path.join(TPFolder, 'error.log') );

        if (fs.existsSync(path.join(TPFolder, 'TurboPutative_results.zip'))) {
            status = 'ok';
        }

        if (fs.existsSync(path.join(TPFolder, 'error.log'))) {
            status = 'error';
        }
        console.log( `status: ${status}`);
        return status;
    });

    if (status.some(e => e == 'error')) {
        res.json({ status: 'error' });
    } else if (status.some(e => e == 'waiting')) {
        res.json({ status: 'waiting' });
    }

    if (status.every(e => e == 'ok')) {

        const code = await addTPFilter(ion_mode, jobID, myPath, myLogging)

        const m2i = await new Promise(resolve => fs.readFile(
            path.join(myPath, 'm2i.json'),
            'utf-8',
            (err, data) => resolve(JSON.parse(data))
        ));

        res.json({ status: 'ok', m2i: m2i });
    }

})

// Local function
const addTPFilter = (ion_mode, jobID, myPath, myLogging) => {
    return new Promise((resolve, reject) => {

        let params = [
            path.join(__dirname, '../scripts/py/addTPFilter.py')
        ];

        ion_mode.split('_').map(mode => {
            const TPFolder = path.join(
                __dirname,
                `../../public/jobs/${jobID}_${mode}`
            );
            params.push(
                `--tpfilter=${path.join(TPFolder, 'tsv/4_TPFilter.tsv')}`
            )
        });

        params = [
            ...params,
            `--m2i=${path.join(myPath, "m2i.json")}`,
            `--m2itp=${path.join(myPath, "m2iTP.json")}`
        ]

        myLogging(`Run script: python ${params.join(' ')}`);

        const process = spawn(
            global.pythonPath,
            params,
            { encoding: 'utf-8' }
        )

        process.stdout.on('data', data => fs.appendFileSync(
            path.join(myPath, `addTPFilter.log`),
            `stdout: ${data}`)
        );

        process.stderr.on('data', data => fs.appendFileSync(
            path.join(myPath, `addTPFilter.log`),
            `stderr: ${data}`)
        );

        process.on('close', code => {
            if (code == 0) {
                myLogging(`TPFilter table was added`);
                resolve(0);
            } else {
                myLogging(`Error adding TPFilter`);
                resolve(1);
            }
        });
    })
}

// export
module.exports = router;