const pool = require('../db/pool');

// Middleware helpers for authorization
function requireAdmin(req, res, next) {
  if (req.session && req.session.isAdmin) return next();
  return res.status(403).send('Forbidden');
}

function requireSelfOrAdmin(req, res, next) {
  const requestedId = Number(req.params.id);
  const sessionWorkerId = Number(req.session?.workerId || 0);
  if (req.session?.isAdmin || sessionWorkerId === requestedId) return next();
  return res.status(403).send('Forbidden');
}

module.exports = {
  requireAdmin,
  requireSelfOrAdmin
};
