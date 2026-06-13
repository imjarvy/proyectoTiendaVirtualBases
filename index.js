require('dotenv').config();

const express = require('express');
const cors = require('cors');
const conectarDB = require('./src/config/db');
const { errorHandler, notFound } = require('./src/middlewares/errorHandler');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors({
  origin: process.env.CLIENT_URL || '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

app.get('/', (req, res) => {
  res.json({
    success: true,
    mensaje: 'API Tienda Virtual - MongoDB 4.0',
    version: '1.0.0',
    endpoints: {
      categorias: '/api/categorias',
      usuarios:   '/api/usuarios',
      productos:  '/api/productos',
      pedidos:    '/api/pedidos',
      inventario: '/api/inventario',
    },
  });
});

app.get('/health', (req, res) => {
  const mongoose = require('mongoose');
  const estados = { 0: 'desconectado', 1: 'conectado', 2: 'conectando', 3: 'desconectando' };
  res.json({
    success: true,
    base_datos: estados[mongoose.connection.readyState],
    uptime_segundos: Math.floor(process.uptime()),
  });
});

// app.use('/api/categorias',  require('./src/routes/categorias'));
app.use('/api/usuarios',    require('./src/routes/usuarios'));
app.use('/api/productos',   require('./src/routes/productos'));
app.use('/api/pedidos',     require('./src/routes/pedidos'));
app.use('/api/inventario',  require('./src/routes/inventario'));

app.use(notFound);
app.use(errorHandler);

const iniciarServidor = async () => {
  await conectarDB();
  app.listen(PORT, () => {
    console.log(`Servidor corriendo en http://localhost:${PORT}`);
    console.log(`Entorno: ${process.env.NODE_ENV || 'development'}`);
  });
};

iniciarServidor();

module.exports = app;
