const pool = require('../db/pool');

async function main() {
  try {
    console.log('Adding MustChangePassword column to Worker table...');
    await pool.query(`ALTER TABLE Worker ADD COLUMN MustChangePassword TINYINT(1) DEFAULT 0`);
    console.log('Column MustChangePassword added successfully.');
    process.exit(0);
  } catch (err) {
    console.error('Error adding column:', err);
    process.exit(1);
  }
}

main();
