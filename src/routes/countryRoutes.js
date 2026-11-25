const express = require('express');
const asyncHandler = require('../utils/asyncHandler');
const controller = require('../controllers/countryController');

const router = express.Router();

router.post('/refresh', asyncHandler(controller.refresh));
router.get('/', asyncHandler(controller.list));
router.get('/image', controller.image);          // must stay above '/:name'
router.get('/:name', asyncHandler(controller.getOne));
router.delete('/:name', asyncHandler(controller.remove));

module.exports = router;