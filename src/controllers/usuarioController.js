const Usuario = require('../models/Usuario');
const Pedido  = require('../models/Pedido');

const crear = async (req, res, next) => {
  try {
    const { nombre, email, password_hash, telefono, direccion, rol } = req.body;

    if (!nombre || !email || !password_hash || !direccion) {
      return res.status(400).json({
        success: false,
        message: 'Los campos nombre, email, password y direccion son obligatorios',
      });
    }

    if (!direccion.calle || !direccion.ciudad || !direccion.pais) {
      return res.status(400).json({
        success: false,
        message: 'La direccion debe incluir calle, ciudad y pais',
      });
    }

    const usuario = await Usuario.create({ nombre, email, password_hash, telefono, direccion, rol });

    const data = usuario.toObject();
    delete data.password_hash;

    res.status(201).json({ success: true, data, message: 'Usuario creado correctamente' });
  } catch (err) {
    next(err);
  }
};

const listar = async (req, res, next) => {
  try {
    const page  = Math.max(1, parseInt(req.query.page)  || 1);
    const limit = Math.min(100, parseInt(req.query.limit) || 20);
    const skip  = (page - 1) * limit;

    const filtro = { activo: true };

    const [usuarios, total] = await Promise.all([
      Usuario.find(filtro)
        .select('-password_hash')
        .sort({ fecha_registro: -1 })
        .skip(skip)
        .limit(limit),
      Usuario.countDocuments(filtro),
    ]);

    res.json({
      success: true,
      data: usuarios,
      message: 'Usuarios obtenidos correctamente',
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
    const usuario = await Usuario.findById(req.params.id).select('-password_hash');

    if (!usuario) {
      return res.status(404).json({ success: false, message: 'Usuario no encontrado' });
    }

    const pedidos = await Pedido.find({ usuario_id: req.params.id })
      .sort({ fecha_pedido: -1 })
      .limit(5)
      .select('numero_pedido total estado fecha_pedido productos');

    res.json({
      success: true,
      data: { ...usuario.toObject(), ultimos_pedidos: pedidos },
      message: 'Usuario obtenido correctamente',
    });
  } catch (err) {
    next(err);
  }
};

const actualizar = async (req, res, next) => {
  try {
    const { nombre, email, telefono, direccion, rol } = req.body;

    const campos = {};
    if (nombre)   campos.nombre   = nombre;
    if (email)    campos.email    = email;
    if (telefono) campos.telefono = telefono;
    if (rol)      campos.rol      = rol;

    if (direccion) {
      if (direccion.calle)        campos['direccion.calle']        = direccion.calle;
      if (direccion.ciudad)       campos['direccion.ciudad']       = direccion.ciudad;
      if (direccion.departamento) campos['direccion.departamento'] = direccion.departamento;
      if (direccion.pais)         campos['direccion.pais']         = direccion.pais;
      if (direccion.cp)           campos['direccion.cp']           = direccion.cp;
    }

    const usuario = await Usuario.findByIdAndUpdate(
      req.params.id,
      { $set: campos },
      { new: true, runValidators: true }
    ).select('-password_hash');

    if (!usuario) {
      return res.status(404).json({ success: false, message: 'Usuario no encontrado' });
    }

    res.json({ success: true, data: usuario, message: 'Usuario actualizado correctamente' });
  } catch (err) {
    next(err);
  }
};

const eliminar = async (req, res, next) => {
  try {
    const usuario = await Usuario.findByIdAndUpdate(
      req.params.id,
      { $set: { activo: false } },
      { new: true }
    ).select('-password_hash');

    if (!usuario) {
      return res.status(404).json({ success: false, message: 'Usuario no encontrado' });
    }

    res.json({ success: true, data: usuario, message: 'Usuario desactivado correctamente' });
  } catch (err) {
    next(err);
  }
};

module.exports = { crear, listar, obtenerUno, actualizar, eliminar };
