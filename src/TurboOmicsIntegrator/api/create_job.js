const express = require('express');
const fs = require('fs');
const path = require('path');

const myLogger = require('../scripts/js/myLogger');
const createDirectoryTree = require('../scripts/js/createDirectoryTree');

const dataScalerImputer = require('../scripts/js/dataScalerImputer');
const PCA_ANOVA_PY = require('../scripts/js/pcaAnovaAnalysis');
const MOFA_ANOVA_PY = require('../scripts/js/mofaAnovaAnalysis');

// Variables
const router = express.Router();


/*
Escribir tablas de forma síncrona
*/
function writeJSON(jsonObject, filePath) {
    return new Promise((resolve, reject) => {
        fs.writeFile(
            filePath,
            JSON.stringify(jsonObject),
            'utf-8',
            err => {
                if (err) {
                    console.log(err);
                    reject(1)
                } else {
                    resolve(0)
                }
            }
        );
    })
}

/*
Descripción: 
    Ruta para para inicializar trabajo (Create Job). 
    Se crea el árbol de directorios.
    Se realiza el centrado, escalado e imputación de MV en las tablas xq y xm.
    Se guarda el objeto JobContext actualizado y se retorna a cliente
    Se ejecutan los módulos que no precisan configuración de usuario

Params:
    - JobContext: Objeto JSON con toda la información recopilada en new-job
Return
    - JobContextNorm: Objeto JSON donde se añaden las tablas xq y xm procesadas
*/
router.post('/create_job', async (req, res) => {

    // Get job context
    const jobContext = req.body;
    myPath = path.join(__dirname, '../jobs', jobContext.jobID);
    myPathX = path.join(myPath, 'EDA/xPreProcessing');
    myPathPCA = path.join(myPath, 'EDA/PCA');
    myPathMOFA = path.join(myPath, 'MOFA');

    // Create directory tree
    createDirectoryTree(myPath);

    // Create logging
    const myLogging = myLogger(myPath);
    myLogging(`Creating job: ${req.body.jobID}`);

    // Center, Scale and Impute missing values
    myLogging('Centering and scaling data');

    const p_xi = jobContext.omics.map(omic =>
        dataScalerImputer(jobContext, `x${omic}`, myPathX, myLogging)
    );

    await new Promise(resolve => {
        Promise.all(p_xi).then(p_res => {
            p_res.map(p_res_i => {
                jobContext.norm[p_res_i.fileType] = p_res_i.xi_norm;
            })
            resolve(0)
        });
    });

    // Write mdata, q2i and m2i synchronously
    myLogging('Writing job files');

    // jobContext used in find job
    const dataFiles = {
        xq: null,
        xm: null,
        xt: null,
        mdata: null,
        q2i: null,
        m2i: null,
        t2i: null
    }

    const preJobContext = {
        ...jobContext,
        user: dataFiles,
        index: dataFiles,
        norm: {
            xq: null,
            xm: null,
            xt: null
        },
        mdataType: {}
    };

    await new Promise(resolve => {
        Promise.all(jobContext.omics.map(omic => {
            writeJSON(jobContext.user[`${omic}2i`], path.join(myPathX, `${omic}2i.json`))
        })
        ).then(values => resolve(0));
    });

    await new Promise(resolve => {
        Promise.all([
            writeJSON(jobContext.user.mdata, path.join(myPathX, 'mdata.json')),
            writeJSON(jobContext.index, path.join(myPathX, 'index.json')),
            writeJSON(jobContext.mdataType, path.join(myPathX, 'mdataType.json')),
            writeJSON(preJobContext, path.join(myPath, 'preJobContext.json'))
        ]).then(values => resolve(0));
    });


    /*
    Run modules that can be run without user configuration
    */

    // await until .status file is created
    await new Promise((resolve) => {
        Promise.all(jobContext.omics.map(
            omic => PCA_ANOVA_PY(myPathX, myPathPCA, omic, myLogging)
        )).then(values => resolve(0))
    });

    await MOFA_ANOVA_PY(myPathX, myPathMOFA, jobContext.omics, myLogging);

    // Send jobContext
    res.json(jobContext);
});


/*
Descripción:
    Peticiones del fichero .log al servidor para conocer
    la evolución en la creación del trabajo
Params:
    - jobID
Return:
    - .log content
*/
router.get('/get_create_job_log/:jobID', (req, res) => {
    const jobID = req.params.jobID;
    const myPath = path.join(__dirname, '../jobs', jobID);
    const myPathLog = path.join(myPath, '.log')

    let myLogJson = [{msg:'Sending data to server'}];
    if (fs.existsSync(myPathLog)) {
        const myLog = fs.readFileSync(myPathLog, 'utf-8');
        myLogJson = myLog.split('\n').slice(0, -1);
        myLogJson = myLogJson.map(e => {
            let out = {};
            let elems = e.split(' - ');
            out.time = elems.slice(0, 2).join(' - ');
            out.msg = elems.slice(2).join(' - ');
            return out
        });
    }

    res.send(myLogJson);
});

module.exports = router;