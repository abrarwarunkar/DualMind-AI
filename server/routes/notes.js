const express = require('express');
const router = express.Router();
const {
    getNotes,
    getNote,
    updateNote,
    deleteNote,
} = require('../controllers/notesController');
const { protect } = require('../middleware/auth');

router.get('/', protect, getNotes);
router.get('/:id', protect, getNote);
router.put('/:id', protect, updateNote);
router.delete('/:id', protect, deleteNote);

module.exports = router;
