require('dotenv').config();
const mongoose = require('mongoose');
const { faker } = require('@faker-js/faker/locale/es');
const Usuario = require('../src/models/Usuario');

const TOTAL    = 500000;
const LOTE     = 5000;

const CIUDADES = [
  'Bogota', 'Medellin', 'Cali', 'Barranquilla', 'Cartagena',
  'Bucaramanga', 'Pereira', 'Manizales', 'Cucuta', 'Ibague',
  'Santa Marta', 'Villavicencio', 'Pasto', 'Monteria', 'Neiva',
];

const DEPARTAMENTOS = {
  'Bogota': 'Cundinamarca', 'Medellin': 'Antioquia', 'Cali': 'Valle del Cauca',
  'Barranquilla': 'Atlantico', 'Cartagena': 'Bolivar', 'Bucaramanga': 'Santander',
  'Pereira': 'Risaralda', 'Manizales': 'Caldas', 'Cucuta': 'Norte de Santander',
  'Ibague': 'Tolima', 'Santa Marta': 'Magdalena', 'Villavicencio': 'Meta',
  'Pasto': 'Narino', 'Monteria': 'Cordoba', 'Neiva': 'Huila',
};

const generarLote = (offset) => {
  const docs = [];
  for (let i = 0; i < LOTE; i++) {
    const ciudad = CIUDADES[Math.floor(Math.random() * CIUDADES.length)];
    const nombre = faker.person.fullName();
    // Email único usando índice para evitar colisiones
    const email  = `usuario${offset + i + 1}@tienda.com`;

    // Fecha aleatoria en los últimos 3 años
    const hace3anos = new Date();
    hace3anos.setFullYear(hace3anos.getFullYear() - 3);
    const fecha_registro = faker.date.between({ from: hace3anos, to: new Date() });

    docs.push({
      nombre,
      email,
      password_hash: '$2b$10$placeholderHashParaSeedNoUsarEnProduccion123456',
      telefono: `+57 3${Math.floor(Math.random() * 9 + 1)}0 ${faker.string.numeric(3)} ${faker.string.numeric(4)}`,
      direccion: {
        calle:        `${faker.location.streetAddress()}`,
        ciudad,
        departamento: DEPARTAMENTOS[ciudad],
        pais:         'Colombia',
        cp:           faker.string.numeric(6),
      },
      rol:            'cliente',
      activo:         true,
      fecha_registro,
      ultima_sesion:  faker.date.between({ from: fecha_registro, to: new Date() }),
    });
  }
  return docs;
};

const main = async () => {
  const inicio = Date.now();

  await mongoose.connect(process.env.MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  });
  console.log('Conectado a MongoDB');

  await Usuario.deleteMany({});
  console.log('Coleccion usuarios limpiada');

  const lotes = Math.ceil(TOTAL / LOTE);
  let insertados = 0;

  for (let i = 0; i < lotes; i++) {
    const docs = generarLote(i * LOTE);

    // insertMany con ordered:false para mejor rendimiento en lotes
    await Usuario.insertMany(docs, { ordered: false });
    insertados += docs.length;

    if (insertados % 50000 === 0 || insertados === TOTAL) {
      const elapsed = ((Date.now() - inicio) / 1000).toFixed(1);
      console.log(`  ${insertados.toLocaleString()} / ${TOTAL.toLocaleString()} usuarios (${elapsed}s)`);
    }
  }

  const tiempo = ((Date.now() - inicio) / 1000).toFixed(2);
  console.log(`\n${insertados.toLocaleString()} usuarios insertados en ${tiempo}s`);

  await mongoose.connection.close();
};

main().catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});
