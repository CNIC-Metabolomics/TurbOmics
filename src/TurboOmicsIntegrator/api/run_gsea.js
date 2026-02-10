// Import modules
const express = require("express");
const path = require("path");
const fs = require("fs");
const { spawn } = require("child_process");


// Constants
const router = express.Router();

async function joinFiles(inputFiles, gmtFile, outputFile) {
    let content = '';

    // Add GMT file first
    const gmtData = await fs.promises.readFile(gmtFile, 'utf8');
    content += gmtData + '\n';

    // Add other files
    for (const file of inputFiles) {
        const data = await fs.promises.readFile(file, 'utf8');
        content += data + '\n';
    }

    // Write final GM file
    await fs.promises.writeFile(outputFile, content, 'utf8');
}

// Routes
router.post('/run_gsea/:jobID/:omic/:gseaID/:os', async (req, res) => {

    const { omic, jobID, gseaID, os } = req.params;
    const gseaData = req.body;

    // Set working path
    const myPath = path.join(__dirname, '../jobs', jobID, 'GSEA', omic, gseaID);

    // Check if gseaID exists
    const existGseaId = await new Promise(resolve => {
        fs.access(myPath, (err) => { resolve(!err) })
    });

    // If exists send it
    if (existGseaId) {
        res.json({ status: 'exists' });
        return;
    }

    // Write working path
    await new Promise(resolve => {
        fs.mkdir(myPath, {}, () => resolve(0))
    });

    // Write GSEA input
    await new Promise(resolve => {
        fs.writeFile(
            path.join(myPath, 'EID_GN_RankStat.json'),
            JSON.stringify(gseaData), 'utf-8',
            () => resolve(0)
        );
    });

    // Run GSEA script
    const myGseaPath = path.join(__dirname, '../scripts/R/myGSEA');
    const exec = [
        path.join(myGseaPath, 'myGSEA.R'),
        myGseaPath,
        myPath,
        os
    ];

    const cmd = `${global.RPath} ${exec.join(' ')}`;
    console.log(`** ${cmd}`);
    const process = spawn(
        global.RPath,
        exec,
        { encoding: 'utf-8' }
    );

    process.stdout.on('data', data => fs.appendFileSync(
        path.join(myPath, `.log`), `stdout: ${data}`)
    );

    process.stderr.on('data', data => fs.appendFileSync(
        path.join(myPath, `.log`), `stderr: ${data}`)
    );

    process.on('close', code => {
        if (code == 0) {
            console.log(`GSEA executed successfully on ${omic}`);
        } else {
            fs.appendFileSync(
                path.join(myPath, `error.log`), JSON.stringify({ status: 'error' })
            );
            console.log(`GSEA Error on ${omic}`);
        }
    })

    res.json({ status: 'running' });

});

router.post('/run_msea/:jobID/:omic/:gseaID/:os', async (req, res) => {

    const { jobID, gseaID, os, omic } = req.params;
    const gseaData = req.body;
    const cpwFiles = req.body.cpwFiles || [];

    // Set paths
    const myPathBase = path.join(__dirname, '../jobs', jobID);
    const myPathCPW = path.join(myPathBase, 'CPW');
    const myPath = path.join(myPathBase, 'GSEA', omic, gseaID, 'msea');
    const myPathKEGG = path.join(myPath, 'KEGG');
    const myPathChEBI = path.join(myPath, 'ChEBI');

    // Write working path
    await new Promise(resolve => {
        fs.mkdir(myPathCPW, {}, () => resolve(0))
    });

    // Check if gseaID exists
    const existGseaId = await new Promise(resolve => {
        fs.access(myPath, (err) => { resolve(!err) })
    });

    // If exists send it
    if (existGseaId) {
        res.json({ status: 'exists' });
        return;
    }

    // Create working directory
    await new Promise(r => fs.mkdir(myPathKEGG, { recursive: true }, () => r(0)));
    await new Promise(r => fs.mkdir(myPathChEBI, { recursive: true }, () => r(0)));

    // Write input
    await new Promise(rAll => {
        Promise.all(Object.keys(gseaData).map(db => {
            return new Promise(r => {
                fs.writeFile(
                    path.join(myPath, db, `RankStat.json`), 
                    JSON.stringify(gseaData[db]), () => r(0)
                );
            })
        })).then(() => rAll(0))
    });

    // Execute MSEA
    // Run GSEA script

    Object.keys(gseaData).map( async db => {
        let infile = path.join(myPath, db, `RankStat.json`);
        let outfile = path.join(myPath, db, `${db}_GSEA.json`);
        let osAbbr, gmtfile;

        if (db == 'KEGG') {
            osAbbr = `${os.split('_')[0].toLowerCase().slice(0,1)}${os.split('_')[1].slice(0,2).toLowerCase()}`;
                gmtfile = path.join(
                    __dirname, 
                    '../scripts/data/kegg_metabolomics', 
                    `RBR_KEGG_${osAbbr}_pathways_compounds_R110.gmt`
                );

            // check gmt
            const gmtExist = await new Promise(
                r => fs.readFile(gmtfile, (err, data) => r(!err))
            );
            if (!gmtExist) {
                gmtfile = path.join(
                    __dirname, 
                    '../scripts/data/kegg_metabolomics', 
                    `RBR_KEGG_hsa_pathways_compounds_R110.gmt`
                );
            }

        }
        
        if (db == 'ChEBI') {
                gmtfile = path.join(
                    __dirname, 
                    '../scripts/data/reactome_metabolomics', 
                    `RBR_Reactome_${os}_pathways_ChEBI_R89.gmt`
                );

            // check gmt
            const gmtExist = await new Promise(
                r => fs.readFile(gmtfile, (err, data) => r(!err))
            );
            if (!gmtExist) {
                gmtfile = path.join(
                    __dirname, 
                    '../scripts/data/reactome_metabolomics', 
                    `RBR_Reactome_Homo_sapiens_pathways_ChEBI_R89.gmt`
                );
            }
        }

        // Full paths of given custom pathways
        const cpwFilePaths = cpwFiles.map(f =>
            path.join(myPathCPW, f)
        );

        // Create the custom pathway (in GMT format)
        const cpwGMT = path.join(myPathCPW, `joined_${gseaID}.gmt`);
        await joinFiles(cpwFilePaths, gmtfile, cpwGMT);

console.log(cpwFilePaths);
console.log(gmtfile);

        const myGseaPath = path.join(__dirname, '../scripts/R/myGSEA');
        const exec = [
            path.join(myGseaPath, 'myMSEA.R'),
            infile,
            cpwGMT,
            outfile
        ];

        const cmd = `${global.RPath} ${exec.join(' ')}`;
        console.log(`** ${cmd}`);
        const process = spawn(
            global.RPath,
            exec,
            { encoding: 'utf-8' }
        );
    
        process.stdout.on('data', data => fs.appendFileSync(
            path.join(myPath, db, `.log`), `stdout: ${data}`)
        );
    
        process.stderr.on('data', data => fs.appendFileSync(
            path.join(myPath, db, `.log`), `stderr: ${data}`)
        );
    
        process.on('close', code => {
            if (code == 0) {
                console.log(`GSEA executed successfully on ${omic}`);
            } else {
                fs.appendFileSync(
                    path.join(myPath, db, `error.log`), JSON.stringify({ status: 'error' })
                );
                console.log(`MSEA Error on ${db}`);
            }
        });
    });

    res.json({ status: 'running' });
});

router.post('/run_mummichog/:jobID/:omic/:gseaID/:os', async (req, res) => {

    const { jobID, omic, gseaID, os } = req.params;
    const gseaData = req.body;

    // Set working path
    const myPath = path.join(__dirname, '../jobs', jobID, 'GSEA', omic, gseaID, 'mummichog');

    // Check if gseaID exists
    const existGseaId = await new Promise(resolve => {
        fs.access(myPath, (err) => { resolve(!err) })
    });

    // If exists send it
    if (existGseaId) {
        res.json({ status: 'exists' });
        return;
    }

    // Write working path
    await new Promise(resolve => {
        fs.mkdir(myPath, { recursive: true }, () => resolve(0))
    });

    // 
    const myPromises = Object.keys(gseaData).map(mode => {
        return new Promise(async resolve => {

            // set path for mode
            const myPathMode = path.join(myPath, mode);

            // create mode folder
            await new Promise(r => fs.mkdir(myPathMode, () => r(0)));

            // write infile.tsv
            const infilePath = path.join(myPathMode, 'infile.tsv');
            await new Promise(r => fs.writeFile(infilePath, gseaData[mode], () => r(0)));

            // Execute mummichog
            const exec = [
                '-m', 'mummichog.main',
                `--infile=${infilePath}`,
                `--output=results`,
                `--workdir=${myPathMode}`,
                `--mode=${mode == 'pos' ? 'positive' : 'negative'}`,
                `--permutation=100`,
                `-c`, `0.1`
            ];

            const cmd = `${global.pythonPath} ${exec.join(' ')}`;
            console.log(`** ${cmd}`);
            const process = spawn(
                global.pythonPath,
                exec,
                { encoding: 'utf-8' }
            );

            process.stdout.on('data', data => fs.appendFileSync(
                path.join(myPathMode, `.log`), `stdout: ${data}`)
            );

            process.stderr.on('data', data => fs.appendFileSync(
                path.join(myPathMode, `.log`), `stderr: ${data}`)
            );

            process.on('close', code => {
                if (code == 0) {
                    console.log(`mummichog executed successfully on ${omic}`);
                } else {
                    fs.appendFileSync(
                        path.join(myPathMode, `error.log`), JSON.stringify({ status: 'error' })
                    );
                    console.log(`mummichog Error on ${omic}`);
                }
            });

            resolve(0);

        });
    });

    await new Promise(r => Promise.all(myPromises).then((values) => r(0)));

    res.json({ status: 'running' });

});

// Export
module.exports = router;