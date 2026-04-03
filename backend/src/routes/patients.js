const express = require('express');
const router = express.Router();

// TODO: implement patients routes
router.get('/', (req, res) => res.json({ route: 'patients', status: 'stub' }));

module.exports = router;
