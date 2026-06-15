require('dotenv').config();
const mongoose = require('mongoose');
const fs       = require('fs');
const path     = require('path');
const Categoria = require('../src/models/Categoria');

const CATEGORIAS = [
  { nombre: 'Electronica',           slug: 'electronica',           descripcion: 'Dispositivos electronicos, gadgets y accesorios tecnologicos' },
  { nombre: 'Computadores',          slug: 'computadores',          descripcion: 'Laptops, desktops y accesorios de computo' },
  { nombre: 'Celulares',             slug: 'celulares',             descripcion: 'Smartphones, tablets y accesorios moviles' },
  { nombre: 'Television',            slug: 'television',            descripcion: 'Televisores, proyectores y accesorios de video' },
  { nombre: 'Audio',                 slug: 'audio',                 descripcion: 'Audifonos, parlantes y equipos de sonido' },
  { nombre: 'Camaras',               slug: 'camaras',               descripcion: 'Camaras fotograficas, de video y accesorios' },
  { nombre: 'Videojuegos',           slug: 'videojuegos',           descripcion: 'Consolas, juegos y accesorios gaming' },
  { nombre: 'Ropa Hombre',           slug: 'ropa-hombre',           descripcion: 'Ropa, zapatos y accesorios para hombre' },
  { nombre: 'Ropa Mujer',            slug: 'ropa-mujer',            descripcion: 'Ropa, zapatos y accesorios para mujer' },
  { nombre: 'Ropa Ninos',            slug: 'ropa-ninos',            descripcion: 'Ropa y calzado para ninos y bebes' },
  { nombre: 'Calzado',               slug: 'calzado',               descripcion: 'Zapatos, tenis y sandalias para toda la familia' },
  { nombre: 'Deportes',              slug: 'deportes',              descripcion: 'Ropa deportiva, equipos y accesorios' },
  { nombre: 'Fitness',               slug: 'fitness',               descripcion: 'Equipos de gimnasio y accesorios de entrenamiento' },
  { nombre: 'Futbol',                slug: 'futbol',                descripcion: 'Balones, guayos, uniformes y accesorios de futbol' },
  { nombre: 'Ciclismo',              slug: 'ciclismo',              descripcion: 'Bicicletas, cascos, luces y accesorios' },
  { nombre: 'Hogar',                 slug: 'hogar',                 descripcion: 'Muebles, decoracion y articulos para el hogar' },
  { nombre: 'Cocina',                slug: 'cocina',                descripcion: 'Electrodomesticos, utensilios y accesorios de cocina' },
  { nombre: 'Bano',                  slug: 'bano',                  descripcion: 'Accesorios y articulos para el bano' },
  { nombre: 'Dormitorio',            slug: 'dormitorio',            descripcion: 'Camas, colchones, sabanas y almohadas' },
  { nombre: 'Iluminacion',           slug: 'iluminacion',           descripcion: 'Lamparas, bombillas y sistemas de iluminacion' },
  { nombre: 'Herramientas',          slug: 'herramientas',          descripcion: 'Herramientas manuales y electricas para el hogar' },
  { nombre: 'Jardineria',            slug: 'jardineria',            descripcion: 'Plantas, macetas, herramientas y accesorios de jardin' },
  { nombre: 'Supermercado',          slug: 'supermercado',          descripcion: 'Alimentos, bebidas y productos de consumo masivo' },
  { nombre: 'Bebidas',               slug: 'bebidas',               descripcion: 'Agua, jugos, refrescos y bebidas energeticas' },
  { nombre: 'Snacks',                slug: 'snacks',                descripcion: 'Pasabocas, dulces y productos de mecato' },
  { nombre: 'Mascotas',              slug: 'mascotas',              descripcion: 'Alimentos, accesorios y productos para mascotas' },
  { nombre: 'Salud',                 slug: 'salud',                 descripcion: 'Medicamentos, vitaminas y productos de salud' },
  { nombre: 'Belleza',               slug: 'belleza',               descripcion: 'Maquillaje, cremas y productos de cuidado personal' },
  { nombre: 'Cuidado Personal',      slug: 'cuidado-personal',      descripcion: 'Shampoo, jabones, desodorantes y aseo personal' },
  { nombre: 'Bebes',                 slug: 'bebes',                 descripcion: 'Pañales, teteros, ropa y accesorios para bebes' },
  { nombre: 'Juguetes',              slug: 'juguetes',              descripcion: 'Juguetes, juegos de mesa y didacticos' },
  { nombre: 'Libros',                slug: 'libros',                descripcion: 'Libros fisicos y digitales de todos los generos' },
  { nombre: 'Papeleria',             slug: 'papeleria',             descripcion: 'Cuadernos, lapices, mochilas y utiles escolares' },
  { nombre: 'Musica',                slug: 'musica',                descripcion: 'Instrumentos musicales y accesorios' },
  { nombre: 'Arte',                  slug: 'arte',                  descripcion: 'Materiales de arte, pintura y manualidades' },
  { nombre: 'Automoviles',           slug: 'automoviles',           descripcion: 'Accesorios, repuestos y cuidado del vehiculo' },
  { nombre: 'Motos',                 slug: 'motos',                 descripcion: 'Accesorios, cascos y repuestos para motos' },
  { nombre: 'Viajes',                slug: 'viajes',                descripcion: 'Maletas, mochilas y accesorios de viaje' },
  { nombre: 'Oficina',               slug: 'oficina',               descripcion: 'Muebles, papeleria y accesorios de oficina' },
  { nombre: 'Impresion',             slug: 'impresion',             descripcion: 'Impresoras, tintas y accesorios de impresion' },
  { nombre: 'Redes',                 slug: 'redes',                 descripcion: 'Routers, cables y accesorios de red' },
  { nombre: 'Energia Solar',         slug: 'energia-solar',         descripcion: 'Paneles solares, baterias y accesorios' },
  { nombre: 'Seguridad',             slug: 'seguridad',             descripcion: 'Camaras de seguridad, alarmas y cerraduras' },
  { nombre: 'Drones',                slug: 'drones',                descripcion: 'Drones, repuestos y accesorios' },
  { nombre: 'Impresion 3D',          slug: 'impresion-3d',          descripcion: 'Impresoras 3D, filamentos y herramientas' },
  { nombre: 'Realidad Virtual',      slug: 'realidad-virtual',      descripcion: 'Gafas VR, accesorios y juegos de realidad virtual' },
  { nombre: 'Smartwatch',            slug: 'smartwatch',            descripcion: 'Relojes inteligentes y accesorios' },
  { nombre: 'GPS',                   slug: 'gps',                   descripcion: 'Navegadores GPS y accesorios de rastreo' },
  { nombre: 'Climatizacion',         slug: 'climatizacion',         descripcion: 'Aires acondicionados, ventiladores y calefactores' },
  { nombre: 'Construccion',          slug: 'construccion',          descripcion: 'Materiales y herramientas de construccion' },
];

const main = async () => {
  const inicio = Date.now();

  await mongoose.connect(process.env.MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  });
  console.log('Conectado a MongoDB');

  await Categoria.deleteMany({});
  console.log('Coleccion categorias limpiada');

  const categorias = await Categoria.insertMany(CATEGORIAS);
  console.log(`${categorias.length} categorias insertadas`);

  const ids = categorias.map(c => ({ _id: c._id.toString(), nombre: c.nombre, slug: c.slug }));
  const rutaIds = path.join(__dirname, 'categorias-ids.json');
  fs.writeFileSync(rutaIds, JSON.stringify(ids, null, 2));
  console.log(`IDs guardados en: ${rutaIds}`);

  const tiempo = ((Date.now() - inicio) / 1000).toFixed(2);
  console.log(`Tiempo total: ${tiempo}s`);

  await mongoose.connection.close();
};

main().catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});
