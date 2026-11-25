 const { ExternalApiError } = require('../utils/errors');

const COUNTRIES_BASE = 'https://api.restcountries.com/countries/v5';
const RATES_URL = 'https://open.er-api.com/v6/latest/USD';
const TIMEOUT_MS = 15000;
const PAGE_SIZE = 100; // free-plan maximum
const FIELDS = 'names.common,capitals,region,population,flag.url_svg,currencies';

 async function fetchJson(url, apiName, headers = {}, retries = 2) {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const res = await fetch(url, {
        headers,
        signal: AbortSignal.timeout(TIMEOUT_MS),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.json();
    } catch (err) {
      console.error(`[${apiName}] attempt ${attempt + 1} failed:`, err.cause || err.message);
      if (attempt === retries) throw new ExternalApiError(apiName);
      await new Promise((r) => setTimeout(r, 1000 * (attempt + 1)));
    }
  }
}

// currencies can be an object keyed by code, or an array
function extractCurrencyCode(currencies) {
  if (Array.isArray(currencies)) {
    const first = currencies[0];
    if (typeof first === 'string') return first;
    return (first && first.code) || null;
  }
  if (currencies && typeof currencies === 'object') {
    const keys = Object.keys(currencies);
    if (keys.length === 0) return null;
    const first = currencies[keys[0]];
    return (first && first.code) || keys[0];
  }
  return null;
}

// convert a v5 record into the shape refreshService expects
function normalize(c) {
  const code = extractCurrencyCode(c.currencies);
  return {
    name: c.names && c.names.common,
    capital: Array.isArray(c.capitals) && c.capitals[0] ? c.capitals[0].name : null,
    region: c.region || null,
    population: c.population,
    flag: c.flag && c.flag.url_svg ? c.flag.url_svg : null,
    currencies: code ? [{ code }] : [],
  };
}

async function fetchCountries() {
  const key = process.env.COUNTRIES_API_KEY;
  if (!key) {
    console.error('[Countries API] COUNTRIES_API_KEY is missing from .env');
    throw new ExternalApiError('Countries API');
  }

  const headers = { Authorization: `Bearer ${key}` };
  const all = [];
  let offset = 0;

  for (let page = 0; page < 10; page++) {
    const url = `${COUNTRIES_BASE}?limit=${PAGE_SIZE}&offset=${offset}&response_fields=${FIELDS}`;
    const body = await fetchJson(url, 'Countries API', headers);

    const objects = body && body.data && body.data.objects;
    if (!Array.isArray(objects)) throw new ExternalApiError('Countries API');

    all.push(...objects.map(normalize));

    if (!body.data.meta || !body.data.meta.more) break;
    offset += PAGE_SIZE;
  }

  return all;
}

async function fetchRates() {
  const data = await fetchJson(RATES_URL, 'Exchange Rates API');
  if (!data || typeof data.rates !== 'object' || data.rates === null) {
    throw new ExternalApiError('Exchange Rates API');
  }
  return data.rates;
}

module.exports = { fetchCountries, fetchRates };