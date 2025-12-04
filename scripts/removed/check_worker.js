const pool = require('../db/pool');

async function main() {
  try {
    const email = process.argv[2] || 'demo.user@makerspace.test';
    const [rows] = await pool.query('SELECT WorkerID, Email, PasswordHash, MustChangePassword FROM Worker WHERE Email = ?', [email]);
    if (!rows || rows.length === 0) {
      console.log('No worker found for', email);
      process.exit(0);
    }
    console.log(rows[0]);
    process.exit(0);
  } catch (err) {
    console.error('Error querying worker:', err);
    process.exit(1);
  }
}

main();
