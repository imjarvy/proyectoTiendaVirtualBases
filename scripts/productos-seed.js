require('dotenv').config();
const mongoose   = require('mongoose');
const { faker }  = require('@faker-js/faker/locale/es');
const fs         = require('fs');
const path       = require('path');
const Producto   = require('../src/models/Producto');
const Inventario = require('../src/models/Inventario');

const TOTAL = 300000;
const LOTE  = 3000;

// Plantillas de productos por categoría para nombres más realistas
const PLANTILLAS = {
  'electronica':      ['Smart TV', 'Tablet', 'Smartwatch', 'Router WiFi', 'Camara IP', 'Power Bank'],
  'computadores':     ['Laptop', 'PC Escritorio', 'Monitor', 'Teclado Mecanico', 'Mouse Gaming', 'Webcam'],
  'celulares':        ['Smartphone', 'Funda', 'Cargador', 'Audifonos Bluetooth', 'Soporte Celular'],
  'audio':            ['Audifonos', 'Parlante Bluetooth', 'Barra de Sonido', 'Subwoofer', 'Amplificador'],
  'videojuegos':      ['Control', 'Headset Gaming', 'Silla Gamer', 'Mouse Pad XL', 'Capturadora'],
  'ropa-hombre':      ['Camiseta', 'Jean', 'Chaqueta', 'Pantalon', 'Camisa Formal', 'Polo'],
  'ropa-mujer':       ['Blusa', 'Vestido', 'Falda', 'Leggings', 'Blazer', 'Top'],
  'deportes':         ['Tenis Running', 'Camiseta Deportiva', 'Short', 'Maleta Gym', 'Guantes'],
  'hogar':            ['Sofa', 'Mesa de Centro', 'Estanteria', 'Lampara', 'Alfombra', 'Cuadro'],
  'cocina':           ['Licuadora', 'Cafetera', 'Microondas', 'Sarten', 'Juego de Ollas', 'Cuchillos'],
  'mascotas':         ['Concentrado Perro', 'Concentrado Gato', 'Cama Mascota', 'Correa', 'Juguete'],
  'salud':            ['Vitamina C', 'Omega 3', 'Proteina Whey', 'Termometro', 'Oximetro'],
  'belleza':          ['Crema Facial', 'Serum', 'Shampoo', 'Acondicionador', 'Perfume', 'Base Maquillaje'],
  'juguetes':         ['Lego', 'Muñeca', 'Carro Control Remoto', 'Rompecabezas', 'Juego de Mesa'],
  'libros':           ['Novela', 'Libro de Programacion', 'Autoayuda', 'Historia', 'Ciencia Ficcion'],
};

const MARCAS = ['Samsung', 'LG', 'Sony', 'Apple', 'Huawei', 'Xiaomi', 'HP', 'Lenovo', 'Asus',
  'Dell', 'Logitech', 'Bose', 'JBL', 'Nike', 'Adidas', 'Puma', 'Zara', 'H&M',
  'Whirlpool', 'Haceb', 'Imusa', 'Alpina', 'Nestle', 'Procter', 'Colgate'];

const cargarCategoriasIds = () => {
  const ruta = path.join(__dirname, 'categorias-ids.json');
  if (!fs.existsSync(ruta)) {
    console.error('ERROR: categorias-ids.json no encontrado. Ejecutar primero: npm run seed:categorias');
    process.exit(1);
  }
  return JSON.parse(fs.readFileSync(ruta, 'utf8'));
};

const nombreProducto = (categoriaSlug, marca) => {
  const opciones = PLANTILLAS[categoriaSlug] || ['Producto'];
  const tipo = opciones[Math.floor(Math.random() * opciones.length)];
  const modelo = faker.string.alphanumeric({ length: 5, casing: 'upper' });
  return `${tipo} ${marca} ${modelo}`;
};

const generarLote = (categorias, offset) => {
  const productos = [];
  for (let i = 0; i < LOTE; i++) {
    const cat   = categorias[Math.floor(Math.random() * categorias.length)];
    const marca = MARCAS[Math.floor(Math.random() * MARCAS.length)];
    const precio = Math.round((Math.random() * 4999500 + 500) / 100) * 100; // 500 a 5.000.000 COP

    productos.push({
      nombre:      nombreProducto(cat.slug, marca),
      descripcion: faker.commerce.productDescription(),
      precio,
      sku:         `${cat.slug.slice(0, 3).toUpperCase()}-${faker.string.alphanumeric({ length: 8, casing: 'upper' })}-${offset + i + 1}`,
      categoria_id: new mongoose.Types.ObjectId(cat._id),
      imagenes:    [`https://cdn.tienda.com/productos/${cat.slug}-${offset + i + 1}.jpg`],
      atributos:   { marca, modelo: faker.string.alphanumeric({ length: 6, casing: 'upper' }) },
      activo:      true,
    });
  }
  return productos;
};

const main = async () => {
  const inicio = Date.now();

  const categorias = cargarCategoriasIds();
  console.log(`${categorias.length} categorias cargadas`);

  await mongoose.connect(process.env.MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  });
  console.log('Conectado a MongoDB');

  await Producto.deleteMany({});
  await Inventario.deleteMany({});
  console.log('Colecciones productos e inventario limpiadas');

  const lotes      = Math.ceil(TOTAL / LOTE);
  let insertados   = 0;
  const productosIds = [];

  for (let i = 0; i < lotes; i++) {
    const docs = generarLote(categorias, i * LOTE);
    const result = await Producto.insertMany(docs, { ordered: false });
    insertados += result.length;

    // Crear documentos de inventario para cada producto insertado
    const inventarioDocs = result.map(p => ({
      producto_id:        p._id,
      cantidad:           Math.floor(Math.random() * 500),
      cantidad_reservada: 0,
      ultimo_movimiento:  new Date(),
      historial:          [],
    }));
    await Inventario.insertMany(inventarioDocs, { ordered: false });

    // Guardar muestra de IDs (solo los primeros 50k para el seed de pedidos)
    if (productosIds.length < 50000) {
      result.forEach(p => productosIds.push(p._id.toString()));
    }

    if (insertados % 30000 === 0 || insertados === TOTAL) {
      const elapsed = ((Date.now() - inicio) / 1000).toFixed(1);
      console.log(`  ${insertados.toLocaleString()} / ${TOTAL.toLocaleString()} productos (${elapsed}s)`);
    }
  }

  // Guardar IDs para que pedidos-seed.js los use
  const rutaIds = path.join(__dirname, 'productos-ids.json');
  fs.writeFileSync(rutaIds, JSON.stringify(productosIds, null, 2));
  console.log(`IDs guardados en: ${rutaIds}`);

  const tiempo = ((Date.now() - inicio) / 1000).toFixed(2);
  console.log(`\n${insertados.toLocaleString()} productos + ${insertados.toLocaleString()} inventarios en ${tiempo}s`);

  await mongoose.connection.close();
};

main().catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});
