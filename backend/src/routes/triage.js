const express = require('express');
const router = express.Router();

// TODO: implement triage routes
router.get('/', (req, res) => res.json({ route: 'triage', status: 'stub' }));

module.exports = router;
