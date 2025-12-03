const pool = require('../db/pool');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

async function columnExists(columnName) {
  const [rows] = await pool.query("SHOW COLUMNS FROM Worker LIKE ?", [columnName]);
  return rows && rows.length > 0;
}

function generatePassword() {
  // 12 character, URL-safe base64 string
  return crypto.randomBytes(12).toString('base64url');
}

async function main() {
  try {
    // Ensure PasswordHash column exists
    const hasPasswordHash = await columnExists('PasswordHash');
    if (!hasPasswordHash) {
      console.log('Adding PasswordHash and MustChangePassword columns to Worker table...');
      await pool.query(`ALTER TABLE Worker
        ADD COLUMN PasswordHash VARCHAR(255) NULL,
        ADD COLUMN MustChangePassword TINYINT(1) DEFAULT 0`);
      console.log('Columns added.');
    } else {
      console.log('PasswordHash column already exists.');
    }

    // Select workers without a password
    const [workers] = await pool.query(`SELECT WorkerID, FirstName, LastName, Email FROM Worker WHERE PasswordHash IS NULL OR PasswordHash = ''`);
    if (!workers || workers.length === 0) {
      console.log('No workers need passwords assigned.');
      process.exit(0);
    }

    const outRows = [];
    for (const w of workers) {
      const tempPassword = generatePassword();
      const hash = await bcrypt.hash(tempPassword, 10);
      await pool.query('UPDATE Worker SET PasswordHash = ?, MustChangePassword = 1 WHERE WorkerID = ?', [hash, w.WorkerID]);
      outRows.push({ WorkerID: w.WorkerID, Email: w.Email || '', FirstName: w.FirstName || '', LastName: w.LastName || '', TempPassword: tempPassword });
      console.log(`Assigned password to ${w.Email || w.WorkerID}`);
    }

    // Write CSV with credentials (store securely and remove after distribution)
    const csvPath = path.join(__dirname, 'worker_initial_passwords.csv');
    const header = 'WorkerID,Email,FirstName,LastName,TemporaryPassword\n';
    const body = outRows.map(r => `${r.WorkerID},"${r.Email}","${r.FirstName}","${r.LastName}","${r.TempPassword}"`).join('\n');
    fs.writeFileSync(csvPath, header + body, { encoding: 'utf8', flag: 'w' });
    console.log(`Wrote temporary passwords to ${csvPath}. Delete it after distributing to workers.`);
    process.exit(0);
  } catch (err) {
    console.error('Error assigning passwords:', err);
    process.exit(1);
  }
}

main();
