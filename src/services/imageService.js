const fs = require('fs');
const path = require('path');
const { createCanvas } = require('@napi-rs/canvas');
const pool = require('../config/db');
const { IMAGE_PATH } = require('../utils/paths');

const formatNumber = (n) =>
  Number(n).toLocaleString('en-US', { maximumFractionDigits: 0 });

async function generateSummaryImage(lastRefreshedAt) {
  const [[{ total }]] = await pool.query('SELECT COUNT(*) AS total FROM countries');
  const [top] = await pool.query(
    `SELECT name, estimated_gdp FROM countries
     WHERE estimated_gdp IS NOT NULL
     ORDER BY estimated_gdp DESC
     LIMIT 5`
  );

  const width = 800;
  const height = 480;
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext('2d');

  // background
  ctx.fillStyle = '#0f172a';
  ctx.fillRect(0, 0, width, height);

  // title
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 32px sans-serif';
  ctx.fillText('Country Currency Summary', 40, 30 + 32);

  // total
  ctx.fillStyle = '#94a3b8';
  ctx.font = '20px sans-serif';
  ctx.fillText('Total countries', 40, 120);
  ctx.fillStyle = '#38bdf8';
  ctx.font = 'bold 40px sans-serif';
  ctx.fillText(String(total), 40, 168);

  // top 5
  ctx.fillStyle = '#94a3b8';
  ctx.font = '20px sans-serif';
  ctx.fillText('Top 5 by estimated GDP', 40, 230);

  ctx.font = '22px sans-serif';
  top.forEach((row, i) => {
    const y = 270 + i * 36;
    ctx.fillStyle = '#ffffff';
    ctx.fillText(`${i + 1}. ${row.name}`, 40, y);
    ctx.fillStyle = '#4ade80';
    ctx.fillText(formatNumber(row.estimated_gdp), 360, y);
  });

  // timestamp
  ctx.fillStyle = '#94a3b8';
  ctx.font = '18px sans-serif';
  ctx.fillText(`Last refreshed: ${new Date(lastRefreshedAt).toISOString()}`, 40, height - 30);

  fs.mkdirSync(path.dirname(IMAGE_PATH), { recursive: true });
  fs.writeFileSync(IMAGE_PATH, canvas.toBuffer('image/png'));
}

module.exports = { generateSummaryImage };