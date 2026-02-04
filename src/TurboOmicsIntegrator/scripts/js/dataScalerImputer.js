/*
Import modules
*/
const path = require('path');
const fs = require('fs');
const { spawnSync, spawn } = require('child_process');

fileType2omic = { 'xq': 'Proteomic', 'xm': 'Metabolomic', 'xt': 'Transcriptomic' };

/*
Escribir xi.json, escalar e imputar missing values
*/
function dataScalerImputer(jobContext, fileType, myPathX, myLogging) {
    return new Promise(async (resolve, reject) => {

        const p = await new Promise(resolveWriting => {
            fs.writeFile(
                path.join(myPathX, `${fileType}.json`),
                JSON.stringify(jobContext.user[fileType]),
                'utf-8',
                () => resolveWriting(0)
            );
        });

        const exec = [
            path.join(__dirname, '../../scripts/py/data_scaler_and_imputer.py'),
            `--infile=${path.join(myPathX, `${fileType}.json`)}`,
            `--norm=${jobContext.results.PRE.norm[fileType]}`,
            jobContext.results.PRE.scale[fileType] ? '--scale' : '--no-scale',
            `--impute-method=${jobContext.results.PRE.MVType[fileType]}`,
            `--impute-mvthr=${jobContext.results.PRE.MVThr[fileType]}`,
            `--RPath=${global.RPath}`,
            `--myVSNR=${path.join(__dirname, '../../scripts/R/myVSN.R')}`
        ];

        console.log(`** ${global.pythonPath} ${exec.join(' ')}`);

        const process = spawn(
            global.pythonPath,
            exec,
            { encoding: 'utf-8' }
        )

        process.stdout.on('data', data => fs.appendFileSync(
            path.join(myPathX, `${fileType}.log`),
            `stdout: ${data}`)
        );

        process.stderr.on('data', data => fs.appendFileSync(
            path.join(myPathX, `${fileType}.log`),
                `stderr: ${data}`)
        );

        process.on('close', code => {
            if (code == 0) {
                myLogging(`${fileType2omic[fileType]} data was preprocessed`);

                fs.readFile(
                    path.join(myPathX, `${fileType}_norm.json`), 'utf-8',
                    (err, data) => resolve({fileType, xi_norm: JSON.parse(data)})
                )
            } else {
                reject(1);
            }
        })
    })
}

module.exports = dataScalerImputer;