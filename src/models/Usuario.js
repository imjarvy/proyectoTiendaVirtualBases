const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const DireccionSchema = new mongoose.Schema(
  {
    calle:        { type: String, required: true, trim: true },
    ciudad:       { type: String, required: true, trim: true },
    departamento: { type: String, trim: true, default: '' },
    pais:         { type: String, required: true, default: 'Colombia' },
    cp:           { type: String, trim: true, default: '' },
  },
  { _id: false }
);

const UsuarioSchema = new mongoose.Schema(
  {
    nombre: {
      type: String,
      required: [true, 'El nombre es obligatorio'],
      trim: true,
      maxlength: 150,
    },
    email: {
      type: String,
      required: [true, 'El email es obligatorio'],
      unique: true,
      trim: true,
      lowercase: true,
    },
    password_hash: {
      type: String,
      required: true,
      select: false,
    },
    telefono: {
      type: String,
      trim: true,
      default: '',
    },
    direccion: {
      type: DireccionSchema,
      required: true,
    },
    rol: {
      type: String,
      enum: ['cliente', 'admin'],
      default: 'cliente',
    },
    activo: {
      type: Boolean,
      default: true,
    },
    ultima_sesion: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: { createdAt: 'fecha_registro', updatedAt: 'fecha_actualizacion' },
    collection: 'usuarios',
  }
);

UsuarioSchema.index({ activo: 1 });
UsuarioSchema.index({ 'direccion.ciudad': 1 });
UsuarioSchema.index({ activo: 1, fecha_registro: -1 });

UsuarioSchema.pre('save', async function (next) {
  if (!this.isModified('password_hash')) return next();
  const salt = await bcrypt.genSalt(10);
  this.password_hash = await bcrypt.hash(this.password_hash, salt);
  next();
});

UsuarioSchema.methods.compararPassword = function (password) {
  return bcrypt.compare(password, this.password_hash);
};

module.exports = mongoose.model('Usuario', UsuarioSchema);
