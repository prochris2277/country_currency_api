class ExternalApiError extends Error {
  constructor(apiName) {
    super(`Could not fetch data from ${apiName}`);
    this.name = 'ExternalApiError';
    this.apiName = apiName;
  }
}

module.exports = { ExternalApiError };