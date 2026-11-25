 require('dotenv').config();
const express = require('express');
const initDb = require('./config/initDb');
const asyncHandler = require('./utils/asyncHandler');
const countryRoutes = require('./routes/countryRoutes');
const { status } = require('./controllers/countryController');
const { notFoundHandler, errorHandler } = require('./utils/errorHandler');
const pool = require('./config/db');
const { refreshCountries } = require('./services/refreshService');

const app = express();
app.use(express.json());

app.get('/', (req, res) => res.json({ message: 'Country Currency API running' }));
app.get('/status', asyncHandler(status));
app.use('/countries', countryRoutes);

app.use(notFoundHandler);
app.use(errorHandler);

const PORT = process.env.PORT || 3000;

 
initDb()
  .then(async () => {
    console.log('Database ready');

    // Check whether countries already exist
    const [rows] = await pool.query(
      'SELECT COUNT(*) AS total FROM countries'
    );

    if (rows[0].total === 0) {
      console.log('Countries table is empty. Starting initial refresh...');

      try {
        const result = await refreshCountries();
        console.log('Initial refresh completed:', result);
      } catch (err) {
        console.error('Initial refresh failed:', err.message);
      }
    } else {
      console.log(`${rows[0].total} countries already exist. Skipping initial refresh.`);
    }

    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  })
  .catch((err) => {
    console.error('Database setup failed:', err.message);
    process.exit(1);
  });
