const express = require('express');
const router = express.Router();
const inventory = require('../services/inventory');

/* GET inventory values */
router.get('/', async function(req, res, next) {
    try {
        res.json(await inventory.getMultiple(req.query.page));
    } catch (err) {
        console.error('Error while getting inventory values ', err.message);
        next(err);
    }
});

module.exports = router;