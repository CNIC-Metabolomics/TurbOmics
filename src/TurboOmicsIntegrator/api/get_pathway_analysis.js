// Import libraries
const fs = require('fs');
const path = require('path');
const { Router } = require('express')

// Constants
const router = Router();
const VIEW = {
    'Single-View': 'SV',
    'Multi-View': 'MV'
}
const PWA_FILES = [
    'model_info.json',
    'path_info.json',
    'projections.json'
]

// Routes
router.get('/get_pathway_analysis/:jobID/:view/:runId', async (req, res) => {

    // general variables
    const jobID = req.params.jobID;
    const runId = req.params.runId;
    const view = VIEW[req.params.view]

    // paths
    const myPathBase = path.join(__dirname, '../jobs', jobID);
    const myPath = path.join(myPathBase, 'PWA', view, runId.toString());

    // Check files existence
    const fileExists = async path => !!(await fs.promises.stat(path).catch(e => false));

    // Check error file existence
    const errorLogPath = path.join(myPath, 'error.log');
    if (await fileExists(errorLogPath)) {
        try {
            const raw = await fs.promises.readFile(errorLogPath, 'utf8');
            const errorData = JSON.parse(raw);
            res.json(errorData);
        } catch (err) {
            console.error('Failed to read or parse error.log:', err);
            res.json({
                status: 'error',
                message: 'An unknown error occurred',
            });
        }
        return;
    }

    // Check PathIntegrate files existence
    const finished = await new Promise(r => Promise.all(
        PWA_FILES.map(e => fileExists(path.join(myPath, e)))
    ).then(values => r(values.every(e => e))));

    if (finished) {
        const pwa_res = PWA_FILES.reduce(
            (prev, curr) => ({ ...prev, [curr.replace('.json', '')]: null }), {}
        );
        await new Promise(r =>
            Promise.all(
                PWA_FILES.map(e => {
                    return new Promise(r =>
                        fs.readFile(
                            path.join(myPath, e), 'utf-8',
                            (err, data) => { pwa_res[e.replace('.json', '')] = JSON.parse(data); r(0) }
                        )
                    )
                })
            ).then(e => r(0))
        );
        res.json({status: 'ok', pwa_res: pwa_res, runId});
        return
    }

    res.json({ status: 'waiting', runId});
});

router.get('/get_stats_model/:jobID/:view/:runId', async (req, res)=> {
    // general variables
    const jobID = req.params.jobID;
    const runId = req.params.runId;
    const view = VIEW[req.params.view]

    // paths
    const myPathBase = path.join(__dirname, '../jobs', jobID);
    const myPath = path.join(myPathBase, 'PWA', view, runId.toString());

    // Check files existence
    const fileExists = async path => !!(await fs.promises.stat(path).catch(e => false));

    // Check error file existence
    const error = await fileExists(path.join(myPath, 'error.log'));
    if (error) {
        res.json({ status: 'error' });
        return;
    }

    // Check existence of pvalue_info.json
    const existStatModel = await fileExists(path.join(myPath, 'pvalue_info.json'));
    if(existStatModel) {
        const statsModel = await new Promise(r => fs.readFile(
            path.join(myPath, 'pvalue_info.json'), 'utf-8',
            (err, data) => r(JSON.parse(data))
        ));

        res.json({status:'ok', statsModel});
        return;
    }

    // Otherwise, waiting
    res.json({status: 'waiting'});
});

// Export
module.exports = router;