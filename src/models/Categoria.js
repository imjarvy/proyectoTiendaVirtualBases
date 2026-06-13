const mongoose = require('mongoose');

const CategoriaSchema = new mongoose.Schema(
  {
    nombre: {
      type: String,
      required: [true, 'El nombre es obligatorio'],
      trim: true,
      maxlength: 100,
    },
    descripcion: {
      type: String,
      trim: true,
      default: '',
    },
    slug: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
    },
    imagen_url: {
      type: String,
      default: '',
    },
    activo: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: { createdAt: 'fecha_creacion', updatedAt: 'fecha_actualizacion' },
    collection: 'categorias',
  }
);

CategoriaSchema.index({ activo: 1 });

module.exports = mongoose.model('Categoria', CategoriaSchema);
