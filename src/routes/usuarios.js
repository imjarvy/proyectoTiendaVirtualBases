const express = require('express');
const router  = express.Router();
const { crear, listar, obtenerUno, actualizar, eliminar } = require('../controllers/usuarioController');
const { historialUsuario } = require('../controllers/pedidoController');

router.post('/',                crear);
router.get('/',                 listar);
router.get('/:id',              obtenerUno);
router.put('/:id',              actualizar);
router.delete('/:id',           eliminar);
router.get('/:id/pedidos',      historialUsuario);

module.exports = router;
