const pool = require('./db');

async function initDb() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS countries (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(255) NOT NULL UNIQUE,
      capital VARCHAR(255) NULL,
      region VARCHAR(100) NULL,
      population BIGINT NOT NULL,
      currency_code VARCHAR(10) NULL,
      exchange_rate DOUBLE NULL,
      estimated_gdp DOUBLE NULL,
      flag_url VARCHAR(500) NULL,
      last_refreshed_at DATETIME NOT NULL
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS refresh_meta (
      id INT PRIMARY KEY,
      last_refreshed_at DATETIME NULL
    )
  `);

  await pool.query(`
    INSERT IGNORE INTO refresh_meta (id, last_refreshed_at) VALUES (1, NULL)
  `);
}

module.exports = initDb;