const mongoose = require('mongoose');

const MovimientoSchema = new mongoose.Schema(
  {
    tipo:     { type: String, enum: ['entrada', 'salida'], required: true },
    cantidad: { type: Number, required: true, min: 1 },
    fecha:    { type: Date, default: Date.now },
    motivo:   { type: String, trim: true, default: '' },
  },
  { _id: false }
);

const InventarioSchema = new mongoose.Schema(
  {
    producto_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Producto',
      required: true,
      unique: true,
    },
    cantidad: {
      type: Number,
      required: true,
      min: 0,
      default: 0,
    },
    cantidad_reservada: {
      type: Number,
      default: 0,
      min: 0,
    },
    ultimo_movimiento: {
      type: Date,
      default: Date.now,
    },
    historial: {
      type: [MovimientoSchema],
      default: [],
    },
  },
  {
    timestamps: { createdAt: 'fecha_creacion', updatedAt: 'fecha_actualizacion' },
    collection: 'inventario',
  }
);

InventarioSchema.index({ cantidad: 1 });
InventarioSchema.index({ cantidad: 1, ultimo_movimiento: -1 });

InventarioSchema.methods.registrarMovimiento = async function (tipo, cantidad, motivo = '') {
  if (tipo === 'salida' && cantidad > this.cantidad) {
    throw new Error(`Stock insuficiente. Disponible: ${this.cantidad}`);
  }
  this.cantidad += tipo === 'entrada' ? cantidad : -cantidad;
  this.ultimo_movimiento = new Date();
  this.historial.unshift({ tipo, cantidad, motivo, fecha: new Date() });
  if (this.historial.length > 50) this.historial = this.historial.slice(0, 50);
  return this.save();
};

module.exports = mongoose.model('Inventario', InventarioSchema);
