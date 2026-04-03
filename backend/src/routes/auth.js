const express = require('express');
const router = express.Router();

// TODO: implement auth routes
router.get('/', (req, res) => res.json({ route: 'auth', status: 'stub' }));

module.exports = router;
