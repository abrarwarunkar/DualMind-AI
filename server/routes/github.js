const express = require('express');
const router = express.Router();
const {
    connectGitHub,
    syncToGitHub,
    listRepos,
    disconnectGitHub,
} = require('../controllers/githubController');
const { protect } = require('../middleware/auth');

router.post('/connect', protect, connectGitHub);
router.post('/sync', protect, syncToGitHub);
router.get('/repos', protect, listRepos);
router.delete('/disconnect', protect, disconnectGitHub);

module.exports = router;
