const express = require('express');
const movieController = require('../controllers/movie.controller');
const authMiddleware = require('../middlewares/auth.middleware');
const roleMiddleware = require('../middlewares/role.middleware');

const router = express.Router();

router.get('/', movieController.getAllMovies);
router.get('/recommendations', movieController.getRecommendations);
router.get('/:id/similar', movieController.getSimilarMovies);
router.get('/:id', movieController.getMovieById);

router.post('/', authMiddleware, roleMiddleware(['ADMIN']), movieController.createMovie);
router.put('/:id', authMiddleware, roleMiddleware(['ADMIN']), movieController.updateMovie);
router.delete('/:id', authMiddleware, roleMiddleware(['ADMIN']), movieController.deleteMovie);

module.exports = router;
