const express = require('express');
const router = express.Router();
const { exportPDF, exportMarkdown } = require('../controllers/exportController');
const { protect } = require('../middleware/auth');

router.post('/pdf', protect, exportPDF);
router.post('/markdown', protect, exportMarkdown);

module.exports = router;
