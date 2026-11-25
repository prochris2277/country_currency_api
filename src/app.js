 require('dotenv').config();
const express = require('express');
const initDb = require('./config/initDb');
const asyncHandler = require('./utils/asyncHandler');
const countryRoutes = require('./routes/countryRoutes');
const { status } = require('./controllers/countryController');
const { notFoundHandler, errorHandler } = require('./utils/errorHandler');

const app = express();
app.use(express.json());

app.get('/', (req, res) => res.json({ message: 'Country Currency API running' }));
app.get('/status', asyncHandler(status));
app.use('/countries', countryRoutes);

app.use(notFoundHandler);
app.use(errorHandler);

const PORT = process.env.PORT || 3000;

initDb()
  .then(() => {
    console.log('Database ready');
    app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
  })
  .catch((err) => {
    console.error('Database setup failed:', err.message);
    process.exit(1);
  });