import express from 'express';

const router = express.Router();

// homepage
router.get('/', (req, res) => {
  res.render('index');
});

export default router;
