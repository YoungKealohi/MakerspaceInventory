const pool = require('../db/pool');

async function main() {
  try {
    console.log('Adding IsAdmin column to Worker table...');
    await pool.query(`ALTER TABLE Worker ADD COLUMN IsAdmin TINYINT(1) DEFAULT 0`);
    console.log('Column IsAdmin added successfully.');
    process.exit(0);
  } catch (err) {
    console.error('Error adding IsAdmin column:', err);
    process.exit(1);
  }
}

main();
