const errorHandler = (err, req, res, next) => {
  let statusCode = err.statusCode || 500;
  let mensaje = err.message || 'Error interno del servidor';

  if (err.name === 'ValidationError') {
    statusCode = 400;
    mensaje = Object.values(err.errors).map((e) => e.message).join('. ');
  }

  if (err.code === 11000) {
    statusCode = 409;
    const campo = Object.keys(err.keyValue)[0];
    mensaje = `Ya existe un registro con ${campo}: "${err.keyValue[campo]}"`;
  }

  if (err.name === 'CastError') {
    statusCode = 400;
    mensaje = `ID invalido: "${err.value}"`;
  }

  if (statusCode === 500) console.error('[ERROR]', err.stack);

  return res.status(statusCode).json({ success: false, mensaje });
};

const notFound = (req, res, next) => {
  const error = new Error(`Ruta no encontrada: ${req.method} ${req.originalUrl}`);
  error.statusCode = 404;
  next(error);
};

module.exports = { errorHandler, notFound };
