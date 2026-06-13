const mongoose = require('mongoose');

const ProductoSchema = new mongoose.Schema(
  {
    nombre: {
      type: String,
      required: [true, 'El nombre es obligatorio'],
      trim: true,
      maxlength: 200,
    },
    descripcion: {
      type: String,
      trim: true,
      default: '',
    },
    precio: {
      type: Number,
      required: [true, 'El precio es obligatorio'],
      min: 0,
    },
    sku: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      uppercase: true,
    },
    categoria_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Categoria',
      required: [true, 'La categoria es obligatoria'],
    },
    imagenes: {
      type: [String],
      default: [],
    },
    atributos: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    activo: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: { createdAt: 'fecha_creacion', updatedAt: 'fecha_actualizacion' },
    collection: 'productos',
  }
);

ProductoSchema.index({ categoria_id: 1 });
ProductoSchema.index({ categoria_id: 1, precio: 1 });
ProductoSchema.index({ activo: 1, precio: 1 });
ProductoSchema.index(
  { nombre: 'text', descripcion: 'text' },
  { weights: { nombre: 10, descripcion: 1 }, default_language: 'spanish' }
);

module.exports = mongoose.model('Producto', ProductoSchema);
