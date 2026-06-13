const express = require('express');
const router  = express.Router();
const { listar, ajustarStock, bajoStock } = require('../controllers/inventarioController');

router.get('/',                       listar);
router.get('/bajo-stock',             bajoStock);
router.put('/:producto_id',           ajustarStock);

module.exports = router;
