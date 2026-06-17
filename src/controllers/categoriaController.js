const Categoria = require('../models/Categoria');

const crear = async (req, res, next) => {
  try {
    const { nombre, descripcion, slug, imagen_url } = req.body;
    if (!nombre || !slug) {
      return res.status(400).json({ success: false, message: 'nombre y slug son obligatorios' });
    }
    const categoria = await Categoria.create({ nombre, descripcion, slug, imagen_url });
    res.status(201).json({ success: true, data: categoria, message: 'Categoria creada correctamente' });
  } catch (err) {
    next(err);
  }
};

const listar = async (req, res, next) => {
  try {
    const categorias = await Categoria.find({ activo: true }).sort({ nombre: 1 });
    res.json({ success: true, data: categorias, message: 'Categorias obtenidas correctamente' });
  } catch (err) {
    next(err);
  }
};

const obtenerUna = async (req, res, next) => {
  try {
    const categoria = await Categoria.findById(req.params.id);
    if (!categoria) {
      return res.status(404).json({ success: false, message: 'Categoria no encontrada' });
    }
    res.json({ success: true, data: categoria, message: 'Categoria obtenida correctamente' });
  } catch (err) {
    next(err);
  }
};

const actualizar = async (req, res, next) => {
  try {
    const campos = {};
    const { nombre, descripcion, slug, imagen_url, activo } = req.body;
    if (nombre !== undefined)      campos.nombre      = nombre;
    if (descripcion !== undefined) campos.descripcion = descripcion;
    if (slug !== undefined)        campos.slug        = slug;
    if (imagen_url !== undefined)  campos.imagen_url  = imagen_url;
    if (activo !== undefined)      campos.activo      = activo;

    const categoria = await Categoria.findByIdAndUpdate(
      req.params.id,
      { $set: campos },
      { new: true, runValidators: true }
    );
    if (!categoria) {
      return res.status(404).json({ success: false, message: 'Categoria no encontrada' });
    }
    res.json({ success: true, data: categoria, message: 'Categoria actualizada correctamente' });
  } catch (err) {
    next(err);
  }
};

module.exports = { crear, listar, obtenerUna, actualizar };