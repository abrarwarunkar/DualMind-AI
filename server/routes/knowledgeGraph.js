const express = require('express');
const router = express.Router();
const { getKnowledgeGraph, extractEntities } = require('../controllers/knowledgeGraphController');
const { protect } = require('../middleware/auth');

router.get('/', protect, getKnowledgeGraph);
router.post('/extract/:sessionId', protect, extractEntities);

module.exports = router;
