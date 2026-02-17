// Import modules
const express = require('express');
const fs = require('fs');
const path = require('path');

const router = express.Router();

/*
Description: Buscar trabajos anteriores a partir del ID
Params: 
    - JobID
Return:
    - JSON con todos los resultados del trabajo
    - JSON vacío si el trabajo no tiene resultados
*/
router.get('/search/:jobID', async (req, res) => {
    const jobID = req.params.jobID;

    console.log(`Searching job: ${jobID}`);

    const myPath = path.join(__dirname, '../jobs', jobID);
    const myPathx = path.join(myPath, 'EDA/xPreProcessing');
    const myPathCMM = path.join(myPath, 'CMM_TP');

    // If path does not exist response
    if (!fs.existsSync(myPath)) {
        res.json({ exist: false });
        return;
    }

    // If path does exist build jobContext
    let jobContext = await myReadFn(path.join(myPath, 'preJobContext.json'));

    // Read omic files
    await new Promise(resolve => {
        Promise.all(jobContext.omics.map(async omic => {
            return new Promise(async r => {
                jobContext.user[`x${omic}`] = await myReadFn(path.join(myPathx, `x${omic}.json`));
                jobContext.user[`${omic}2i`] = await myReadFn(path.join(myPathx, `${omic}2i.json`));
                jobContext.user.mdata = await myReadFn(path.join(myPathx, `mdata.json`));
                jobContext.norm[`x${omic}`] = await myReadFn(path.join(myPathx, `x${omic}_norm.json`));
                jobContext.index = await myReadFn(path.join(myPathx, `index.json`));
                jobContext.mdataType = await myReadFn(path.join(myPathx, `mdataType.json`));
                r(0)
            })
        })).then(value => resolve(0))
    });

    // Check annParams
    if (fs.existsSync(path.join(myPathCMM, 'annParams.json'))) {
        jobContext.annParams = await myReadFn(path.join(myPathCMM, 'annParams.json'));
        
        if (fs.existsSync(path.join(myPathx, 'm2iTP.json'))) {
            jobContext.annParams.status = 'ok';
            //jobContext.user.m2i = await myReadFn(path.join(myPathx, 'm2iTP.json'));

            // important!!: force and overwrite the annotation Status
            jobContext.annStatus = 'ok';
        }

        // Check if we have the TP results
        if (fs.existsSync(path.join(myPathCMM, 'pos', 'CMM_pos.json'))) {
            jobContext.annParams.CMM_pos = await myReadFn(path.join(myPathCMM, 'pos', 'CMM_pos.json'));
            jobContext.annParams.TP_pos = `${jobID}_pos`;
        }
        if (fs.existsSync(path.join(myPathCMM, 'neg', 'CMM_neg.json'))) {
            jobContext.annParams.CMM_neg = await myReadFn(path.join(myPathCMM, 'neg', 'CMM_neg.json'));
            jobContext.annParams.TP_neg = `${jobID}_neg`;
        }

    }

    res.json({ exist: true, jobContext });
});

const myReadFn = (filePath) => {
    return new Promise(r => {
        fs.readFile(
            filePath, 'utf-8',
            (err, data) => r(JSON.parse(data))
        );
    })
}

module.exports = router;