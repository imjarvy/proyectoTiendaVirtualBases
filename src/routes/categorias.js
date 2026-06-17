const express = require('express');
const router  = express.Router();
const { crear, listar, obtenerUna, actualizar } = require('../controllers/categoriaController');

router.post('/',    crear);
router.get('/',     listar);
router.get('/:id',  obtenerUna);
router.put('/:id',  actualizar);

module.exports = router;