const fs = require('fs');
const pool = require('../config/db');
const { refreshCountries } = require('../services/refreshService');
const { IMAGE_PATH } = require('../utils/paths');

const SORT_OPTIONS = {
  gdp_desc: 'estimated_gdp DESC',
  gdp_asc: 'estimated_gdp ASC',
  name_asc: 'name ASC',
  name_desc: 'name DESC',
  population_desc: 'population DESC',
  population_asc: 'population ASC',
};

// POST /countries/refresh
async function refresh(req, res) {
  const result = await refreshCountries();
  res.json({
    message: 'Countries refreshed successfully',
    total_countries: result.total,
    last_refreshed_at: result.last_refreshed_at,
  });
}

// GET /countries?region=Africa&currency=NGN&sort=gdp_desc
async function list(req, res) {
  const { region, currency, sort } = req.query;

  const where = [];
  const params = [];

  if (region) {
    where.push('region = ?');
    params.push(String(region));
  }
  if (currency) {
    where.push('currency_code = ?');
    params.push(String(currency));
  }

  let orderBy = 'id ASC';
  if (sort) {
    if (!SORT_OPTIONS[sort]) {
      return res.status(400).json({
        error: 'Validation failed',
        details: { sort: `must be one of: ${Object.keys(SORT_OPTIONS).join(', ')}` },
      });
    }
    orderBy = SORT_OPTIONS[sort];
  }

  const sql =
    'SELECT * FROM countries' +
    (where.length ? ` WHERE ${where.join(' AND ')}` : '') +
    ` ORDER BY ${orderBy}`;

  const [rows] = await pool.query(sql, params);
  res.json(rows);
}

// GET /countries/:name
async function getOne(req, res) {
  const [rows] = await pool.query('SELECT * FROM countries WHERE name = ? LIMIT 1', [
    req.params.name,
  ]);
  if (rows.length === 0) {
    return res.status(404).json({ error: 'Country not found' });
  }
  res.json(rows[0]);
}

// DELETE /countries/:name
async function remove(req, res) {
  const [result] = await pool.query('DELETE FROM countries WHERE name = ?', [
    req.params.name,
  ]);
  if (result.affectedRows === 0) {
    return res.status(404).json({ error: 'Country not found' });
  }
  res.json({ message: 'Country deleted successfully' });
}

// GET /countries/image
function image(req, res) {
  if (!fs.existsSync(IMAGE_PATH)) {
    return res.status(404).json({ error: 'Summary image not found' });
  }
  res.sendFile(IMAGE_PATH);
}

// GET /status
async function status(req, res) {
  const [[{ total }]] = await pool.query('SELECT COUNT(*) AS total FROM countries');
  const [meta] = await pool.query('SELECT last_refreshed_at FROM refresh_meta WHERE id = 1');
  res.json({
    total_countries: total,
    last_refreshed_at: meta.length ? meta[0].last_refreshed_at : null,
  });
}

module.exports = { refresh, list, getOne, remove, image, status };