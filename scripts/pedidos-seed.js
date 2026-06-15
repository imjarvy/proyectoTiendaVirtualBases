require('dotenv').config();
const mongoose  = require('mongoose');
const fs        = require('fs');
const path      = require('path');
const Pedido    = require('../src/models/Pedido');
const Usuario   = require('../src/models/Usuario');
const Producto  = require('../src/models/Producto');

const TOTAL = 699950;
const LOTE  = 5000;

const ESTADOS = [
  { valor: 'entregado', peso: 60 },
  { valor: 'enviado',   peso: 20 },
  { valor: 'pendiente', peso: 15 },
  { valor: 'cancelado', peso: 5  },
];

const METODOS_PAGO = ['tarjeta_credito', 'tarjeta_debito', 'pse', 'efectivo', 'contraentrega'];

// Selecciona un estado según distribución de pesos
const estadoAleatorio = () => {
  const r = Math.random() * 100;
  let acum = 0;
  for (const e of ESTADOS) {
    acum += e.peso;
    if (r < acum) return e.valor;
  }
  return 'entregado';
};

const cargarIds = () => {
  const rutaProductos = path.join(__dirname, 'productos-ids.json');
  if (!fs.existsSync(rutaProductos)) {
    console.error('ERROR: productos-ids.json no encontrado. Ejecutar primero: npm run seed:productos');
    process.exit(1);
  }
  const productosIds = JSON.parse(fs.readFileSync(rutaProductos, 'utf8'));
  return productosIds;
};

const generarLote = async (productosIds, usuariosIds, productosInfo, offset) => {
  const docs = [];

  for (let i = 0; i < LOTE; i++) {
    // Usuario aleatorio
    const usuarioId = usuariosIds[Math.floor(Math.random() * usuariosIds.length)];

    // Entre 1 y 5 productos por pedido
    const cantLineas = Math.floor(Math.random() * 5) + 1;
    const productosSeleccionados = [];
    const usados = new Set();

    for (let j = 0; j < cantLineas; j++) {
      let idx;
      do { idx = Math.floor(Math.random() * productosIds.length); } while (usados.has(idx));
      usados.add(idx);

      const pid    = productosIds[idx];
      const pinfo  = productosInfo[pid];
      if (!pinfo) continue;

      const cantidad = Math.floor(Math.random() * 4) + 1;
      productosSeleccionados.push({
        producto_id:     new mongoose.Types.ObjectId(pid),
        nombre_snapshot: pinfo.nombre,
        precio_snapshot: pinfo.precio,
        cantidad,
        subtotal:        pinfo.precio * cantidad,
      });
    }

    if (productosSeleccionados.length === 0) continue;

    const total = productosSeleccionados.reduce((acc, p) => acc + p.subtotal, 0);
    const estado = estadoAleatorio();

    // Fecha aleatoria en los últimos 2 años
    const hace2anos = new Date();
    hace2anos.setFullYear(hace2anos.getFullYear() - 2);
    const fecha_pedido = new Date(
      hace2anos.getTime() + Math.random() * (Date.now() - hace2anos.getTime())
    );

    const anio  = fecha_pedido.getFullYear();
    const nro   = String(offset + i + 1).padStart(6, '0');

    docs.push({
      numero_pedido: `PED-${anio}-${nro}`,
      usuario_id:    new mongoose.Types.ObjectId(usuarioId),
      productos:     productosSeleccionados,
      direccion_entrega: {
        calle:        'Generada por seed',
        ciudad:       'Bogota',
        departamento: 'Cundinamarca',
        pais:         'Colombia',
        cp:           '110001',
      },
      total,
      estado,
      metodo_pago:       METODOS_PAGO[Math.floor(Math.random() * METODOS_PAGO.length)],
      fecha_pedido,
      fecha_actualizacion: fecha_pedido,
    });
  }

  return docs;
};

const main = async () => {
  const inicio = Date.now();

  const productosIds = cargarIds();
  console.log(`${productosIds.length.toLocaleString()} IDs de productos cargados`);

  await mongoose.connect(process.env.MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  });
  console.log('Conectado a MongoDB');

  // Cargar info de precios y nombres de los productos seleccionados
  console.log('Cargando info de productos...');
  const productosDocumentos = await Producto.find(
    { _id: { $in: productosIds.map(id => new mongoose.Types.ObjectId(id)) } }
  ).select('nombre precio').lean();

  const productosInfo = {};
  productosDocumentos.forEach(p => { productosInfo[p._id.toString()] = { nombre: p.nombre, precio: p.precio }; });
  console.log(`${productosDocumentos.length.toLocaleString()} productos cargados en memoria`);

  // Cargar sample de usuarios
  console.log('Cargando muestra de usuarios...');
  const usuariosDocumentos = await Usuario.find({}).select('_id').limit(50000).lean();
  const usuariosIds = usuariosDocumentos.map(u => u._id.toString());
  console.log(`${usuariosIds.length.toLocaleString()} usuarios disponibles`);

  await Pedido.deleteMany({});
  console.log('Coleccion pedidos limpiada');

  const lotes    = Math.ceil(TOTAL / LOTE);
  let insertados = 0;

  for (let i = 0; i < lotes; i++) {
    const docs = await generarLote(productosIds, usuariosIds, productosInfo, i * LOTE);
    if (docs.length === 0) continue;

    // Usar insertMany directo (sin validaciones de mongoose para velocidad)
    await Pedido.collection.insertMany(docs, { ordered: false });
    insertados += docs.length;

    if (insertados % 70000 === 0 || insertados >= TOTAL) {
      const elapsed = ((Date.now() - inicio) / 1000).toFixed(1);
      const pct     = ((insertados / TOTAL) * 100).toFixed(1);
      console.log(`  ${insertados.toLocaleString()} / ${TOTAL.toLocaleString()} pedidos — ${pct}% (${elapsed}s)`);
    }
  }

  const tiempo = ((Date.now() - inicio) / 1000).toFixed(2);
  console.log(`\n${insertados.toLocaleString()} pedidos insertados en ${tiempo}s`);

  // Resumen final en base de datos
  const [cu, cp, cpd, ci] = await Promise.all([
    Usuario.countDocuments(),
    Producto.countDocuments(),
    Pedido.countDocuments(),
    mongoose.connection.db.collection('inventario').countDocuments(),
  ]);
  const total = cu + cp + cpd + ci + 50;
  console.log('\n=== RESUMEN FINAL ===');
  console.log(`Categorias:  50`);
  console.log(`Usuarios:    ${cu.toLocaleString()}`);
  console.log(`Productos:   ${cp.toLocaleString()}`);
  console.log(`Inventario:  ${ci.toLocaleString()}`);
  console.log(`Pedidos:     ${cpd.toLocaleString()}`);
  console.log(`TOTAL:       ~${total.toLocaleString()} documentos`);

  await mongoose.connection.close();
};

main().catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});
