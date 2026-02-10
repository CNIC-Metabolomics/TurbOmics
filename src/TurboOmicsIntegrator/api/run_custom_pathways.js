// Import modules
const fs = require('fs');
const path = require('path');
const { Router } = require('express');
const multer = require('multer');

// Constants
const router = Router();

// Helper: ensure directory exists
async function ensureDir(dir) {
    try {
        await fs.promises.access(dir);
    } catch {
        await fs.promises.mkdir(dir, { recursive: true });
    }
}

// Multer config (memory upload)
const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: 50 * 1024 * 1024 // 50MB max
    }
});


// GET: list custom pathways
router.get('/get_custom_pathway/:jobID', async (req, res) => {

    try {
        const jobID = req.params.jobID;
        const basePath = path.join(__dirname, '../jobs', jobID);
        const cpwPath = path.join(basePath, 'CPW');

        // If folder does not exist, return empty list
        if (!fs.existsSync(cpwPath)) {
            return res.json({
            status: 'ok',
            pathways: []
            });
        }
        // Read directory
        // Remove joined_ files
        const aux_files = await fs.promises.readdir(cpwPath);
        const files = aux_files.filter(
            file => !file.startsWith('joined_')
        );
        // Build response
        const pathways = await Promise.all(
            files.map(async (file) => {
                const fullPath = path.join(cpwPath, file);
                const stat = await fs.promises.stat(fullPath);
                return {
                    name: path.parse(file).name,
                    file: file,
                    created: stat.birthtime
                };
            })
        );
        // Return
        res.json({
            status: 'ok',
            pathways
        });
    } catch (err) {
        console.error('GET custom pathway error:', err);
        res.status(500).json({
            status: 'error',
            message: 'Failed to read pathways'
        });
    }
});


// POST: upload custom pathway
router.post('/upload_custom_pathway/:jobID', upload.single('file'), async (req, res) => {

    try {
        const jobID = req.params.jobID;
        if (!req.file) {
            return res.status(400).json({
                status: 'error',
                message: 'No file uploaded'
            });
        }
        const basePath = path.join(__dirname, '../jobs', jobID);
        const cpwPath = path.join(basePath, 'CPW');

        // Ensure folder exists
        await ensureDir(cpwPath);
        // Sanitize filename
        const safeName = req.file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_');
        const destPath = path.join(cpwPath, safeName);
        // Save file
        await fs.promises.writeFile(
            destPath,
            req.file.buffer
        );
        // Return
        res.json({
            status: 'ok',
            filename: safeName
        });

    } catch (err) {
        console.error('UPLOAD custom pathway error:', err);
        res.status(500).json({
            status: 'error',
            message: 'Upload failed'
        });
    }
});


// Export
module.exports = router;
