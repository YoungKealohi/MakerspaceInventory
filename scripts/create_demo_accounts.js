const pool = require('../db/pool');
const bcrypt = require('bcryptjs');

(async () => {
  try {
    // Demo Worker Account
    const workerEmail = 'demo.worker@makerspace.demo';
    const workerPassword = 'WorkerDemo123!';
    const workerHash = await bcrypt.hash(workerPassword, 10);

    const [existingWorker] = await pool.query('SELECT WorkerID FROM Worker WHERE Email = ?', [workerEmail]);
    if (existingWorker && existingWorker.length > 0) {
      const id = existingWorker[0].WorkerID;
      await pool.query(
        'UPDATE Worker SET FirstName = ?, LastName = ?, PasswordHash = ?, IsAdmin = 0, IsBoss = 0, MustChangePassword = 0 WHERE WorkerID = ?',
        ['Demo', 'Worker', workerHash, id]
      );
      console.log('✓ Updated demo worker account (WorkerID:', id, ')');
    } else {
      const [r] = await pool.query(
        'INSERT INTO Worker (FirstName, LastName, IsBoss, IsAdmin, PhoneNumber, Email, PasswordHash, MustChangePassword) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
        ['Demo', 'Worker', 0, 0, null, workerEmail, workerHash, 0]
      );
      console.log('✓ Created demo worker account (WorkerID:', r.insertId, ')');
    }

    // Demo Admin Account
    const adminEmail = 'demo.admin@makerspace.demo';
    const adminPassword = 'AdminDemo123!';
    const adminHash = await bcrypt.hash(adminPassword, 10);

    const [existingAdmin] = await pool.query('SELECT WorkerID FROM Worker WHERE Email = ?', [adminEmail]);
    if (existingAdmin && existingAdmin.length > 0) {
      const id = existingAdmin[0].WorkerID;
      await pool.query(
        'UPDATE Worker SET FirstName = ?, LastName = ?, PasswordHash = ?, IsAdmin = 1, IsBoss = 0, MustChangePassword = 0 WHERE WorkerID = ?',
        ['Demo', 'Admin', adminHash, id]
      );
      console.log('✓ Updated demo admin account (WorkerID:', id, ')');
    } else {
      const [r] = await pool.query(
        'INSERT INTO Worker (FirstName, LastName, IsBoss, IsAdmin, PhoneNumber, Email, PasswordHash, MustChangePassword) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
        ['Demo', 'Admin', 0, 1, null, adminEmail, adminHash, 0]
      );
      console.log('✓ Created demo admin account (WorkerID:', r.insertId, ')');
    }

    console.log('\n=== Demo Accounts Created ===');
    console.log('\nWorker Account:');
    console.log('  Email:', workerEmail);
    console.log('  Password:', workerPassword);
    console.log('\nAdmin Account:');
    console.log('  Email:', adminEmail);
    console.log('  Password:', adminPassword);
    console.log('\n=============================\n');

    await pool.end();
  } catch (err) {
    console.error('Error creating demo accounts:', err);
    try { await pool.end(); } catch(_){}
    process.exit(1);
  }
})();