const pool = require('../db/pool');
const bcrypt = require('bcryptjs');

async function main() {
  try {
    // Dummy credentials (change if you prefer)
    const email = 'demo.user@makerspace.test';
    const firstName = 'Demo';
    const lastName = 'User';
    const plainPassword = 'DemoPass123!';

    // Hash the password
    const hash = await bcrypt.hash(plainPassword, 10);

    // Insert worker row
    const [result] = await pool.query(
      `INSERT INTO Worker (FirstName, LastName, Email, PhoneNumber, IsBoss, PasswordHash, MustChangePassword)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [firstName, lastName, email, null, 0, hash, 0]
    );

    console.log('Inserted dummy worker with WorkerID:', result.insertId);
    console.log('Email:', email);
    console.log('Password:', plainPassword);
    process.exit(0);
  } catch (err) {
    console.error('Error creating dummy worker:', err);
    process.exit(1);
  }
}

main();
