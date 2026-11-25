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
    console.log('STEP 1: Database initialized');

    const [rows] = await pool.query(
      'SELECT COUNT(*) AS total FROM countries'
    );

    const total = Number(rows[0].total);

    console.log('STEP 2: Current country count:', total);

    if (total === 0) {
      console.log('STEP 3: Database is empty. Calling refreshCountries...');

      try {
        const result = await refreshCountries();

        console.log('STEP 4: Initial refresh successful:', result);
      } catch (err) {
        console.error('STEP 4: Initial refresh failed:', err);
      }
    } else {
      console.log('STEP 3: Countries already exist. Skipping refresh.');
    }

    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  })
  .catch((err) => {
    console.error('Database initialization failed:', err);
    process.exit(1);
  });
