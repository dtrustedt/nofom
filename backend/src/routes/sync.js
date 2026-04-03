const express = require('express');
const router = express.Router();

// TODO: implement sync routes
router.get('/', (req, res) => res.json({ route: 'sync', status: 'stub' }));

module.exports = router;
