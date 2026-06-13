const Producto   = require('../models/Producto');
const Categoria  = require('../models/Categoria');
const Inventario = require('../models/Inventario');

const crear = async (req, res, next) => {
  try {
    const { nombre, descripcion, precio, sku, categoria_id, imagenes, atributos, stock } = req.body;

    if (!nombre || !precio || !sku || !categoria_id) {
      return res.status(400).json({
        success: false,
        message: 'Los campos nombre, precio, sku y categoria_id son obligatorios',
      });
    }

    const categoriaExiste = await Categoria.findById(categoria_id);
    if (!categoriaExiste) {
      return res.status(404).json({ success: false, message: 'La categoria no existe' });
    }

    const producto = await Producto.create({
      nombre,
      descripcion,
      precio,
      sku,
      categoria_id,
      imagenes,
      atributos,
    });

    // Crear registro de inventario asociado al producto
    await Inventario.create({
      producto_id: producto._id,
      cantidad: stock || 0,
    });

    res.status(201).json({ success: true, data: producto, message: 'Producto creado correctamente' });
  } catch (err) {
    next(err);
  }
};

const listar = async (req, res, next) => {
  try {
    const page     = Math.max(1, parseInt(req.query.page)  || 1);
    const limit    = Math.min(100, parseInt(req.query.limit) || 20);
    const skip     = (page - 1) * limit;

    const filtro = { activo: true };

    if (req.query.categoria)  filtro.categoria_id = req.query.categoria;
    if (req.query.precioMin || req.query.precioMax) {
      filtro.precio = {};
      if (req.query.precioMin) filtro.precio.$gte = Number(req.query.precioMin);
      if (req.query.precioMax) filtro.precio.$lte = Number(req.query.precioMax);
    }
    if (req.query.busqueda) filtro.$text = { $search: req.query.busqueda };

    const [productos, total] = await Promise.all([
      Producto.find(filtro)
        .populate('categoria_id', 'nombre slug')
        .sort({ fecha_creacion: -1 })
        .skip(skip)
        .limit(limit),
      Producto.countDocuments(filtro),
    ]);

    res.json({
      success: true,
      data: productos,
      message: 'Productos obtenidos correctamente',
      paginacion: {
        total,
        pagina: page,
        limite: limit,
        paginas: Math.ceil(total / limit),
      },
    });
  } catch (err) {
    next(err);
  }
};

const obtenerUno = async (req, res, next) => {
  try {
    const producto = await Producto.findById(req.params.id)
      .populate('categoria_id', 'nombre slug descripcion');

    if (!producto) {
      return res.status(404).json({ success: false, message: 'Producto no encontrado' });
    }

    const inventario = await Inventario.findOne({ producto_id: req.params.id })
      .select('cantidad cantidad_reservada ultimo_movimiento');

    res.json({
      success: true,
      data: { ...producto.toObject(), inventario: inventario || null },
      message: 'Producto obtenido correctamente',
    });
  } catch (err) {
    next(err);
  }
};

const actualizar = async (req, res, next) => {
  try {
    const { nombre, descripcion, precio, categoria_id, imagenes, atributos, activo, stock } = req.body;

    const campos = {};
    if (nombre !== undefined)      campos.nombre      = nombre;
    if (descripcion !== undefined) campos.descripcion = descripcion;
    if (precio !== undefined)      campos.precio      = precio;
    if (categoria_id !== undefined) {
      const existe = await Categoria.findById(categoria_id);
      if (!existe) {
        return res.status(404).json({ success: false, message: 'La categoria no existe' });
      }
      campos.categoria_id = categoria_id;
    }
    if (imagenes !== undefined)  campos.imagenes  = imagenes;
    if (atributos !== undefined) campos.atributos = atributos;
    if (activo !== undefined)    campos.activo    = activo;

    const producto = await Producto.findByIdAndUpdate(
      req.params.id,
      { $set: campos },
      { new: true, runValidators: true }
    ).populate('categoria_id', 'nombre slug');

    if (!producto) {
      return res.status(404).json({ success: false, message: 'Producto no encontrado' });
    }

    // Actualizar stock si se envió en el body
    if (stock !== undefined) {
      await Inventario.findOneAndUpdate(
        { producto_id: req.params.id },
        { $set: { cantidad: stock, ultimo_movimiento: new Date() } }
      );
    }

    res.json({ success: true, data: producto, message: 'Producto actualizado correctamente' });
  } catch (err) {
    next(err);
  }
};

const eliminar = async (req, res, next) => {
  try {
    const producto = await Producto.findByIdAndUpdate(
      req.params.id,
      { $set: { activo: false } },
      { new: true }
    );

    if (!producto) {
      return res.status(404).json({ success: false, message: 'Producto no encontrado' });
    }

    res.json({ success: true, data: producto, message: 'Producto desactivado correctamente' });
  } catch (err) {
    next(err);
  }
};

module.exports = { crear, listar, obtenerUno, actualizar, eliminar };
