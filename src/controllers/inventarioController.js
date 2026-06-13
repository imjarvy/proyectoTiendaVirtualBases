const Inventario = require('../models/Inventario');

const listar = async (req, res, next) => {
  try {
    const page  = Math.max(1, parseInt(req.query.page)  || 1);
    const limit = Math.min(100, parseInt(req.query.limit) || 20);
    const skip  = (page - 1) * limit;

    const [items, total] = await Promise.all([
      Inventario.find()
        .populate('producto_id', 'nombre sku precio categoria_id')
        .sort({ ultimo_movimiento: -1 })
        .skip(skip)
        .limit(limit)
        .select('-historial'),
      Inventario.countDocuments(),
    ]);

    res.json({
      success: true,
      data: items,
      message: 'Inventario obtenido correctamente',
      paginacion: { total, pagina: page, limite: limit, paginas: Math.ceil(total / limit) },
    });
  } catch (err) {
    next(err);
  }
};

const ajustarStock = async (req, res, next) => {
  try {
    const { cantidad, tipo, motivo } = req.body;

    if (cantidad === undefined || !tipo) {
      return res.status(400).json({
        success: false,
        message: 'Los campos cantidad y tipo son obligatorios',
      });
    }

    if (!['entrada', 'salida'].includes(tipo)) {
      return res.status(400).json({
        success: false,
        message: 'tipo debe ser "entrada" o "salida"',
      });
    }

    if (!Number.isInteger(cantidad) || cantidad < 1) {
      return res.status(400).json({
        success: false,
        message: 'cantidad debe ser un entero mayor a 0',
      });
    }

    const inventario = await Inventario.findOne({ producto_id: req.params.producto_id });
    if (!inventario) {
      return res.status(404).json({ success: false, message: 'Registro de inventario no encontrado' });
    }

    if (tipo === 'salida' && cantidad > inventario.cantidad) {
      return res.status(400).json({
        success: false,
        message: `Stock insuficiente. Disponible: ${inventario.cantidad}, solicitado: ${cantidad}`,
      });
    }

    await inventario.registrarMovimiento(tipo, cantidad, motivo || 'Ajuste manual');

    res.json({ success: true, data: inventario, message: 'Stock actualizado correctamente' });
  } catch (err) {
    next(err);
  }
};

const bajoStock = async (req, res, next) => {
  try {
    const umbral = parseInt(req.query.umbral) || 10;

    const items = await Inventario.find({ cantidad: { $lte: umbral } })
      .populate('producto_id', 'nombre sku precio categoria_id activo')
      .sort({ cantidad: 1 })
      .select('-historial');

    res.json({
      success: true,
      data: items,
      message: `Productos con stock menor o igual a ${umbral}`,
      total: items.length,
    });
  } catch (err) {
    next(err);
  }
};

module.exports = { listar, ajustarStock, bajoStock };
