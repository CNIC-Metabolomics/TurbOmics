// Import modules
const express = require('express');
const fs = require('fs');
const path = require('path');


// Variables
const router = express.Router();

// Add routes from other files
router.use('/', require('./get_sample_data'));
router.use('/', require('./get_job'));
router.use('/', require('./create_job'));
router.use('/', require('./get_eda_pca'));
router.use('/', require('./get_mofa'));
router.use('/', require('./get_status'));
router.use('/', require('./run_turboputative'));
router.use('/', require('./get_turboputative'));
router.use('/', require('./run_gsea'));
router.use('/', require('./get_gsea'));
router.use('/', require('./run_ora'));
router.use('/', require('./run_pathway_analysis'));
router.use('/', require('./get_pathway_analysis'));
router.use('/', require('./get_vsn_plot'));
router.use('/', require('./extract_multi_assay_experiment'));
router.use('/', require('./get_cmm'));
router.use('/', require('./run_custom_pathways'));

// Export
module.exports = router;