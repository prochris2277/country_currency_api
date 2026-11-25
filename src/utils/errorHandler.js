const { ExternalApiError } = require('./errors');

function notFoundHandler(req, res) {
  res.status(404).json({ error: 'Route not found' });
}

function errorHandler(err, req, res, next) {
  if (err instanceof ExternalApiError) {
    return res.status(503).json({
      error: 'External data source unavailable',
      details: `Could not fetch data from ${err.apiName}`,
    });
  }

  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({
      error: 'Validation failed',
      details: { body: 'is not valid JSON' },
    });
  }

  console.error(err);
  res.status(500).json({ error: 'Internal server error' });
}

module.exports = { notFoundHandler, errorHandler };