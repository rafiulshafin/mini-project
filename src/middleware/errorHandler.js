export function notFoundHandler(req, res, next) {
  if (req.path.startsWith('/api')) {
    return res.status(404).json({
      success: false,
      error: `Endpoint not found: ${req.method} ${req.originalUrl}`
    });
  }
  res.status(404).send('404 - Not Found');
}

export function errorHandler(err, req, res, next) {
  console.error('[Error]', err.stack || err.message);

  const statusCode = err.status || 500;
  const message = err.message || 'Internal Server Error';

  if (req.path.startsWith('/api')) {
    return res.status(statusCode).json({
      success: false,
      error: message
    });
  }

  res.status(statusCode).send(`<h1>Error ${statusCode}</h1><p>${message}</p>`);
}
