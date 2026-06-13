const mongoose = require('mongoose');

const conectarDB = async () => {
  const uri = process.env.MONGODB_URI;

  if (!uri) {
    console.error('[DB] MONGODB_URI no definida en variables de entorno.');
    process.exit(1);
  }

  try {
    await mongoose.connect(uri, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: 10000,
      socketTimeoutMS: 45000,
    });
  } catch (error) {
    console.error('[DB] Error al conectar:', error.message);
    console.log('[DB] Reintentando en 5 segundos...');
    setTimeout(conectarDB, 5000);
  }
};

mongoose.connection.on('connected', () => {
  const db = mongoose.connection.db?.databaseName || process.env.DB_NAME;
  console.log(`[DB] Conectado a: "${db}"`);
});

mongoose.connection.on('disconnected', () => {
  console.warn('[DB] Desconectado. Intentando reconectar...');
});

mongoose.connection.on('error', (err) => {
  console.error('[DB] Error:', err.message);
});

mongoose.connection.on('reconnected', () => {
  console.log('[DB] Reconectado.');
});

process.on('SIGINT', async () => {
  await mongoose.connection.close();
  console.log('[DB] Conexion cerrada. Proceso terminado.');
  process.exit(0);
});

process.on('SIGTERM', async () => {
  await mongoose.connection.close();
  process.exit(0);
});

module.exports = conectarDB;
