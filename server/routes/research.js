const express = require('express');
const router = express.Router();
const {
    createResearch,
    getResearchSessions,
    getResearchSession,
    getResearchChain,
    deleteResearchSession,
} = require('../controllers/researchController');
const { protect } = require('../middleware/auth');
const { aiLimiter } = require('../middleware/rateLimiter');

router.post('/', protect, aiLimiter, createResearch);
router.get('/', protect, getResearchSessions);
router.get('/:id', protect, getResearchSession);
router.get('/:id/chain', protect, getResearchChain);
router.delete('/:id', protect, deleteResearchSession);

module.exports = router;

