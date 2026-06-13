const express = require('express');
const router  = express.Router();
const { crear, listar, obtenerUno, actualizar, eliminar } = require('../controllers/productoController');

router.post('/',      crear);
router.get('/',       listar);
router.get('/:id',    obtenerUno);
router.put('/:id',    actualizar);
router.delete('/:id', eliminar);

module.exports = router;
