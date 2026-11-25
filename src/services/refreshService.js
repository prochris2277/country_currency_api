const pool = require('../config/db');
const { fetchCountries, fetchRates } = require('./externalApis');
const { generateSummaryImage } = require('./imageService');

// random integer between 1000 and 2000 (inclusive), fresh on every call
const randomMultiplier = () => Math.floor(Math.random() * 1001) + 1000;

function buildRecord(country, rates, now) {
  const currencyCode =
    Array.isArray(country.currencies) && country.currencies.length > 0
      ? country.currencies[0].code || null
      : null;

  let exchangeRate = null;
  let estimatedGdp = null;

  if (!currencyCode) {
    // no currency: rate stays null, gdp is 0
    estimatedGdp = 0;
  } else if (typeof rates[currencyCode] === 'number' && rates[currencyCode] > 0) {
    exchangeRate = rates[currencyCode];
    estimatedGdp = (country.population * randomMultiplier()) / exchangeRate;
  }
  // else: currency not in rates, so both stay null

  return {
    name: country.name,
    capital: country.capital || null,
    region: country.region || null,
    population: country.population,
    currency_code: currencyCode,
    exchange_rate: exchangeRate,
    estimated_gdp: estimatedGdp,
    flag_url: country.flag || null,
    last_refreshed_at: now,
  };
}

async function refreshCountries() {
  // 1. Fetch everything BEFORE touching the DB. If either API fails,
  //    an ExternalApiError is thrown and no records are modified.
  const [countries, rates] = await Promise.all([fetchCountries(), fetchRates()]);

  const now = new Date();

  const records = countries
    .filter(
      (c) =>
        c &&
        typeof c.name === 'string' &&
        c.name.trim() !== '' &&
        typeof c.population === 'number'
    )
    .map((c) => buildRecord(c, rates, now));

  // 2. Save everything in one transaction (all or nothing)
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    for (const r of records) {
      await conn.query(
        `INSERT INTO countries
           (name, capital, region, population, currency_code,
            exchange_rate, estimated_gdp, flag_url, last_refreshed_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE
           name = VALUES(name),
           capital = VALUES(capital),
           region = VALUES(region),
           population = VALUES(population),
           currency_code = VALUES(currency_code),
           exchange_rate = VALUES(exchange_rate),
           estimated_gdp = VALUES(estimated_gdp),
           flag_url = VALUES(flag_url),
           last_refreshed_at = VALUES(last_refreshed_at)`,
        [
          r.name, r.capital, r.region, r.population, r.currency_code,
          r.exchange_rate, r.estimated_gdp, r.flag_url, r.last_refreshed_at,
        ]
      );
    }

    await conn.query('UPDATE refresh_meta SET last_refreshed_at = ? WHERE id = 1', [now]);

    await conn.commit();
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }

    // the data is already committed, so an image failure shouldn't fail the refresh
  try {
    await generateSummaryImage(now);
  } catch (err) {
    console.error('Summary image generation failed:', err.message);
  }

  return { total: records.length, last_refreshed_at: now };
}

module.exports = { refreshCountries };