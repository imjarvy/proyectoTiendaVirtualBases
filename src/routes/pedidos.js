const express = require('express');
const router  = express.Router();
const { crear, listar, obtenerUno, cambiarEstado } = require('../controllers/pedidoController');

router.post('/',              crear);
router.get('/',               listar);
router.get('/:id',            obtenerUno);
router.put('/:id/estado',     cambiarEstado);

module.exports = router;
