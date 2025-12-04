const pool = require('../db/pool');
const bcrypt = require('bcryptjs');

(async () => {
  try {
    const firstName = 'John';
    const lastName = 'Marcos';
    const email = 'jmarcos3@my.hpu.edu';
    const password = 'demo123';

    const hash = await bcrypt.hash(password, 10);

    const [existing] = await pool.query('SELECT WorkerID FROM Worker WHERE Email = ?', [email]);
    if (existing && existing.length > 0) {
      const id = existing[0].WorkerID;
      const [r] = await pool.query(
        'UPDATE Worker SET FirstName = ?, LastName = ?, PasswordHash = ?, IsAdmin = 1, MustChangePassword = 0 WHERE WorkerID = ?',
        [firstName, lastName, hash, id]
      );
      console.log('updated', id);
    } else {
      const [r] = await pool.query(
        'INSERT INTO Worker (FirstName, LastName, IsBoss, IsAdmin, PhoneNumber, Email, PasswordHash, MustChangePassword) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
        [firstName, lastName, 0, 1, null, email, hash, 0]
      );
      console.log('inserted', r.insertId);
    }
    await pool.end();
  } catch (err) {
    console.error(err);
    try { await pool.end(); } catch(_){}
    process.exit(1);
  }
})();
