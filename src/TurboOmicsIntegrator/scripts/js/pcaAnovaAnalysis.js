/*
Import modules
*/
const path = require('path')
const { spawn } = require("child_process");
const fs = require("fs");

/*
Constants
*/

// Files that must be generated after the execution
const pcaFiles = [
    'anova.json',
    'explained_variance.json',
    'loadings.json',
    'projections.json'
];

/*
Local function
*/
function checkFileExistence(myPath, files) {
    for (const file of files) {
        if (!fs.existsSync(path.join(myPath, file))) {
            return false;
        }
    }
    return true;
}

/*
Main function
*/
function PCA_ANOVA_PY(myPathX, myPathPCA, omic, myLogging) {

    return new Promise(resolve => {

        const script = 'pca_anova_analysis.py';

        fs.writeFile(
            path.join(myPathPCA, omic, '.status'),
            JSON.stringify({ status: 'waiting' }),
            () => resolve(0)
        );

        // Run PCA ANOVA
        params = [
                path.join(__dirname, `../../scripts/py/${script}`),
                omic,
                path.join(myPathX, `x${omic}_norm.json`),
                path.join(myPathX, `mdata.json`),
                path.join(myPathX, `mdataType.json`),
                path.join(myPathX, `index.json`),
                path.join(myPathPCA, omic)
        ]
            
        myLogging(`** ${global.pythonPath} ${params.join(' ')}`);

        const process = spawn(
            global.pythonPath,
            params,
            { encoding: 'utf-8' }
        );

        process.stdout.on('data', data => fs.appendFile(
            path.join(myPathPCA, omic, '.log'),
            `stdout: ${data}`, () => { })
        );

        process.stderr.on('data', data => fs.appendFile(
            path.join(myPathPCA, omic, '.log'),
            `stderr: ${data}`, () => { })
        );

        process.on('close', code => {
            myLogging(`${script} process in ${omic} omic exited with code ${code}`);
            if (
                code == 0 &&
                checkFileExistence(
                    path.join(myPathPCA, omic),
                    pcaFiles
                )
            ) {
                fs.writeFileSync(
                    path.join(myPathPCA, omic, '.status'),
                    JSON.stringify({ status: 'ok', code: code })
                )
            }
            else {
                fs.writeFileSync(
                    path.join(myPathPCA, omic, '.status'),
                    JSON.stringify({ status: 'error', code: code })
                )
            }
        })
    })
}

module.exports = PCA_ANOVA_PY;