const mongoose = require('mongoose');

const ProductoEnPedidoSchema = new mongoose.Schema(
  {
    producto_id:      { type: mongoose.Schema.Types.ObjectId, ref: 'Producto', required: true },
    nombre_snapshot:  { type: String, required: true, trim: true },
    precio_snapshot:  { type: Number, required: true, min: 0 },
    cantidad:         { type: Number, required: true, min: 1 },
    subtotal:         { type: Number, required: true, min: 0 },
  },
  { _id: false }
);

const DireccionEntregaSchema = new mongoose.Schema(
  {
    calle:        { type: String, required: true },
    ciudad:       { type: String, required: true },
    departamento: { type: String, default: '' },
    pais:         { type: String, required: true, default: 'Colombia' },
    cp:           { type: String, default: '' },
  },
  { _id: false }
);

const PedidoSchema = new mongoose.Schema(
  {
    numero_pedido: {
      type: String,
      unique: true,
      trim: true,
    },
    usuario_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Usuario',
      required: [true, 'El usuario es obligatorio'],
    },
    productos: {
      type: [ProductoEnPedidoSchema],
      validate: {
        validator: (arr) => arr.length > 0,
        message: 'El pedido debe tener al menos un producto',
      },
    },
    direccion_entrega: {
      type: DireccionEntregaSchema,
      required: true,
    },
    total: {
      type: Number,
      required: true,
      min: 0,
    },
    estado: {
      type: String,
      enum: ['pendiente', 'enviado', 'entregado', 'cancelado'],
      default: 'pendiente',
    },
    metodo_pago: {
      type: String,
      enum: ['tarjeta_credito', 'tarjeta_debito', 'pse', 'efectivo', 'contraentrega'],
      required: true,
    },
  },
  {
    timestamps: { createdAt: 'fecha_pedido', updatedAt: 'fecha_actualizacion' },
    collection: 'pedidos',
  }
);

PedidoSchema.index({ usuario_id: 1 });
PedidoSchema.index({ estado: 1 });
PedidoSchema.index({ usuario_id: 1, fecha_pedido: -1 });
PedidoSchema.index({ estado: 1, fecha_pedido: 1 });

PedidoSchema.pre('save', async function (next) {
  if (!this.numero_pedido) {
    const total = await mongoose.model('Pedido').countDocuments();
    const anio = new Date().getFullYear();
    this.numero_pedido = `PED-${anio}-${String(total + 1).padStart(5, '0')}`;
  }
  next();
});

PedidoSchema.pre('save', function (next) {
  if (this.isModified('productos')) {
    this.total = this.productos.reduce((acc, p) => acc + p.subtotal, 0);
  }
  next();
});

module.exports = mongoose.model('Pedido', PedidoSchema);
