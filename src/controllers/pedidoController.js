const mongoose  = require('mongoose');
const Pedido    = require('../models/Pedido');
const Producto  = require('../models/Producto');
const Inventario = require('../models/Inventario');
const Usuario   = require('../models/Usuario');

const crear = async (req, res, next) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { usuario_id, productos, metodo_pago, direccion_entrega } = req.body;

    if (!usuario_id || !productos || !Array.isArray(productos) || productos.length === 0) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({
        success: false,
        message: 'usuario_id y un array de productos son obligatorios',
      });
    }

    if (!metodo_pago) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({ success: false, message: 'El metodo_pago es obligatorio' });
    }

    // Verificar que el usuario existe y obtener su dirección para el snapshot
    const usuario = await Usuario.findById(usuario_id).session(session);
    if (!usuario) {
      await session.abortTransaction();
      session.endSession();
      return res.status(404).json({ success: false, message: 'Usuario no encontrado' });
    }

    // Construir snapshots verificando stock de cada producto
    const productosSnapshot = [];

    for (const item of productos) {
      if (!item.producto_id || !item.cantidad || item.cantidad < 1) {
        await session.abortTransaction();
        session.endSession();
        return res.status(400).json({
          success: false,
          message: `Item invalido: se requiere producto_id y cantidad >= 1`,
        });
      }

      const producto = await Producto.findById(item.producto_id).session(session);
      if (!producto || !producto.activo) {
        await session.abortTransaction();
        session.endSession();
        return res.status(404).json({
          success: false,
          message: `Producto ${item.producto_id} no encontrado o inactivo`,
        });
      }

      const inventario = await Inventario.findOne({ producto_id: item.producto_id }).session(session);
      if (!inventario || inventario.cantidad < item.cantidad) {
        await session.abortTransaction();
        session.endSession();
        return res.status(400).json({
          success: false,
          message: `Stock insuficiente para "${producto.nombre}". Disponible: ${inventario?.cantidad ?? 0}, solicitado: ${item.cantidad}`,
        });
      }

      productosSnapshot.push({
        producto_id:     producto._id,
        nombre_snapshot: producto.nombre,
        precio_snapshot: producto.precio,
        cantidad:        item.cantidad,
        subtotal:        producto.precio * item.cantidad,
      });
    }

    // Calcular total
    const total = productosSnapshot.reduce((acc, p) => acc + p.subtotal, 0);

    // Usar la dirección del body o hacer snapshot de la del usuario
    const entrega = direccion_entrega || usuario.direccion;

    // Crear el pedido dentro de la sesión
    const [pedido] = await Pedido.create(
      [
        {
          usuario_id,
          productos: productosSnapshot,
          direccion_entrega: {
            calle:        entrega.calle,
            ciudad:       entrega.ciudad,
            departamento: entrega.departamento || '',
            pais:         entrega.pais,
            cp:           entrega.cp || '',
          },
          total,
          metodo_pago,
          estado: 'pendiente',
        },
      ],
      { session }
    );

    // Descontar stock de cada producto con bulkWrite dentro de la sesión
    const operacionesBulk = productosSnapshot.map((item) => ({
      updateOne: {
        filter: { producto_id: item.producto_id },
        update: {
          $inc: { cantidad: -item.cantidad },
          $set: { ultimo_movimiento: new Date() },
          $push: {
            historial: {
              $each: [{ tipo: 'salida', cantidad: item.cantidad, motivo: `Pedido ${pedido.numero_pedido}`, fecha: new Date() }],
              $position: 0,
              $slice: 50,
            },
          },
        },
      },
    }));

    await Inventario.bulkWrite(operacionesBulk, { session });

    await session.commitTransaction();
    session.endSession();

    res.status(201).json({ success: true, data: pedido, message: 'Pedido creado correctamente' });
  } catch (err) {
    await session.abortTransaction();
    session.endSession();
    next(err);
  }
};

const listar = async (req, res, next) => {
  try {
    const page  = Math.max(1, parseInt(req.query.page)  || 1);
    const limit = Math.min(100, parseInt(req.query.limit) || 20);
    const skip  = (page - 1) * limit;

    const filtro = {};
    if (req.query.estado) filtro.estado = req.query.estado;

    const [pedidos, total] = await Promise.all([
      Pedido.find(filtro)
        .populate('usuario_id', 'nombre email telefono')
        .sort({ fecha_pedido: -1 })
        .skip(skip)
        .limit(limit),
      Pedido.countDocuments(filtro),
    ]);

    res.json({
      success: true,
      data: pedidos,
      message: 'Pedidos obtenidos correctamente',
      paginacion: { total, pagina: page, limite: limit, paginas: Math.ceil(total / limit) },
    });
  } catch (err) {
    next(err);
  }
};

const obtenerUno = async (req, res, next) => {
  try {
    const pedido = await Pedido.findById(req.params.id)
      .populate('usuario_id', 'nombre email telefono direccion');

    if (!pedido) {
      return res.status(404).json({ success: false, message: 'Pedido no encontrado' });
    }

    res.json({ success: true, data: pedido, message: 'Pedido obtenido correctamente' });
  } catch (err) {
    next(err);
  }
};

const cambiarEstado = async (req, res, next) => {
  try {
    const { estado } = req.body;
    const estadosValidos = ['pendiente', 'enviado', 'entregado', 'cancelado'];

    if (!estado || !estadosValidos.includes(estado)) {
      return res.status(400).json({
        success: false,
        message: `Estado invalido. Valores permitidos: ${estadosValidos.join(', ')}`,
      });
    }

    const pedido = await Pedido.findById(req.params.id);
    if (!pedido) {
      return res.status(404).json({ success: false, message: 'Pedido no encontrado' });
    }

    // No permitir cambios en pedidos ya entregados
    if (pedido.estado === 'entregado') {
      return res.status(400).json({
        success: false,
        message: 'No se puede modificar un pedido que ya fue entregado',
      });
    }

    // Si se cancela un pedido pendiente, devolver el stock
    if (estado === 'cancelado' && pedido.estado === 'pendiente') {
      const operacionesBulk = pedido.productos.map((item) => ({
        updateOne: {
          filter: { producto_id: item.producto_id },
          update: {
            $inc: { cantidad: item.cantidad },
            $set: { ultimo_movimiento: new Date() },
            $push: {
              historial: {
                $each: [{ tipo: 'entrada', cantidad: item.cantidad, motivo: `Cancelacion pedido ${pedido.numero_pedido}`, fecha: new Date() }],
                $position: 0,
                $slice: 50,
              },
            },
          },
        },
      }));
      await Inventario.bulkWrite(operacionesBulk);
    }

    pedido.estado = estado;
    await pedido.save();

    res.json({ success: true, data: pedido, message: `Estado actualizado a "${estado}"` });
  } catch (err) {
    next(err);
  }
};

const historialUsuario = async (req, res, next) => {
  try {
    const page  = Math.max(1, parseInt(req.query.page)  || 1);
    const limit = Math.min(50, parseInt(req.query.limit) || 10);
    const skip  = (page - 1) * limit;

    const usuario = await Usuario.findById(req.params.id).select('nombre email');
    if (!usuario) {
      return res.status(404).json({ success: false, message: 'Usuario no encontrado' });
    }

    const filtro = { usuario_id: req.params.id };
    if (req.query.estado) filtro.estado = req.query.estado;

    const [pedidos, total] = await Promise.all([
      Pedido.find(filtro)
        .sort({ fecha_pedido: -1 })
        .skip(skip)
        .limit(limit)
        .select('numero_pedido productos total estado metodo_pago fecha_pedido'),
      Pedido.countDocuments(filtro),
    ]);

    res.json({
      success: true,
      data: { usuario, pedidos },
      message: 'Historial obtenido correctamente',
      paginacion: { total, pagina: page, limite: limit, paginas: Math.ceil(total / limit) },
    });
  } catch (err) {
    next(err);
  }
};

module.exports = { crear, listar, obtenerUno, cambiarEstado, historialUsuario };
