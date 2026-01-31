// Import modules
const express = require("express");
const fs = require("fs");
const path = require("path");

// Variables
const router = express.Router();
const myPath = path.join(__dirname, "../misc/");

/**
 * Sample configuration
 * Easy to extend with more samples later
 */
const SAMPLE_CONFIG = {
    1: {
        json: {
            xt: {"transpose": true, "name": "transcriptomic_quantifications.tsv", "file": "SampleData_Untarget/transcriptomic_quantifications.tsv"},
            xq: {"transpose": true, "name": "proteomic_quantifications.tsv", "file": "SampleData_Untarget/proteomic_quantifications.tsv"},
            xm: {"transpose": true, "name": "metabolomic_quantifications.tsv", "file": "SampleData_Untarget/metabolomic_quantifications.tsv"},
            mdata: {"transpose": false, "name": "experimental_metadata.tsv", "file": "SampleData_Untarget/experimental_metadata.tsv"},
            t2i: {"transpose": false, "name": "transcriptomic_metadata.tsv", "file": "SampleData_Untarget/transcriptomic_metadata.tsv"},
            q2i: {"transpose": false, "name": "proteomic_metadata.tsv", "file": "SampleData_Untarget/proteomic_metadata.tsv"},
            m2i: {"transpose": false, "name": "metabolomic_metadata.tsv", "file": "SampleData_Untarget/metabolomic_metadata.tsv"},

        },
        zip: "SampleData_Untarget.zip",
    },
    2: {
        json: {
            xq: {"transpose": true, "name": "proteomic_quantifications.tsv", "file": "SampleData_Target/proteomic_quantifications.tsv"},
            xm: {"transpose": true, "name": "metabolomic_quantifications.tsv", "file": "SampleData_Target/metabolomic_quantifications.tsv"},
            mdata: {"transpose": false, "name": "experimental_metadata.tsv", "file": "SampleData_Target/experimental_metadata.tsv"},
            q2i: {"transpose": false, "name": "proteomic_metadata.tsv", "file": "SampleData_Target/proteomic_metadata.tsv"},
            m2i: {"transpose": false, "name": "metabolomic_metadata.tsv", "file": "SampleData_Target/metabolomic_metadata.tsv"},
        },
        zip: "SampleData_Target.zip",
    },
};

/**
 * Helper: validate sample param
 */
function getSampleConfig(req, res) {
    const sample = parseInt(req.query.sample || "1", 10);

    if (!SAMPLE_CONFIG[sample]) {
        res.status(400).json({
            error: 'Invalid "sample" parameter. Allowed values: 1 or 2.',
        });
        return null;
    }

    return SAMPLE_CONFIG[sample];
}

/**
 * Load sample data
 */
router.get("/load_sample_data", (req, res) => {
    console.log("Sending Sample Data");

    const config = getSampleConfig(req, res);
    if (!config) return;

    const resJson = {};
    // Object.entries(config.json).forEach(([key, fileName]) => {
    //     if (!fileName) return;
    //     const filePath = path.join(myPath, fileName);
    //     const fName = path.basename(filePath, path.extname(filePath));
    //     if (fs.existsSync(filePath)) {
    //         resJson[key] = [fName, JSON.parse(
    //             fs.readFileSync(filePath, "utf-8")
    //         )];
    //     } else {
    //         console.warn(`File not found for key "${key}": ${fileName}`);
    //     }
    // });
    Object.entries(config.json).forEach(([key, value]) => {
        if (!value) return;
        let fileName = value.file;
        let name = value.name;
        let transpose = value.transpose;
        const filePath = path.join(myPath, fileName);
        if (fs.existsSync(filePath)) {
            resJson[key] = {"name": name, "transpose": transpose, "data": fs.readFileSync(filePath, "utf-8")};
        } else {
            console.warn(`File not found for key "${key}": ${fileName}`);
        }
    });

    res.json(resJson);
});

/**
 * Download sample data
 */
router.get("/download_sample_data", (req, res) => {
    console.log("Downloading Sample Data");

    const config = getSampleConfig(req, res);
    if (!config) return;

    res.download(path.join(myPath, config.zip));
});

module.exports = router;