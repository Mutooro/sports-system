const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
require('dotenv').config();

// PostgreSQL connection
const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'sports_management_db',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'Os3la123!!',
});

async function resetAdminPassword() {
  const client = await pool.connect();

  try {
    // Check if admin exists
    const checkResult = await client.query(
      'SELECT id, email, role, is_active FROM users WHERE email = $1',
      ['admin@makerere.ac.ug']
    );

    if (checkResult.rows.length === 0) {
      console.log('❌ Admin user not found. Creating new admin...');

      // Hash password with same settings as your app
      const salt = await bcrypt.genSalt(12);
      const hashedPassword = await bcrypt.hash('admin123', salt);

      await client.query(`
        INSERT INTO users (email, password, role, first_name, last_name, is_active, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())
      `, ['admin@makerere.ac.ug', hashedPassword, 'admin', 'System', 'Administrator', true]);

      console.log('✅ Admin user created successfully!');
      console.log('   Email: admin@makerere.ac.ug');
      console.log('   Password: admin123');
      console.log('   Hash:', hashedPassword);
    } else {
      const admin = checkResult.rows[0];
      console.log('✓ Admin user found:', admin);

      // Reset password
      const salt = await bcrypt.genSalt(12);
      const hashedPassword = await bcrypt.hash('admin123', salt);

      await client.query(
        'UPDATE users SET password = $1, is_active = true, updated_at = NOW() WHERE id = $2',
        [hashedPassword, admin.id]
      );

      console.log('✅ Admin password reset successfully!');
      console.log('   Email: admin@makerere.ac.ug');
      console.log('   Password: admin123');
      console.log('   New Hash:', hashedPassword);
    }

    // Verify the password works
    const verifyResult = await client.query(
      'SELECT password FROM users WHERE email = $1',
      ['admin@makerere.ac.ug']
    );

    const isValid = await bcrypt.compare('admin123', verifyResult.rows[0].password);
    console.log('\n🔐 Password verification test:', isValid ? '✅ PASS' : '❌ FAIL');

    if (!isValid) {
      console.log('⚠️  WARNING: Password verification failed. Check bcrypt version/settings.');
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    client.release();
    await pool.end();
  }
}

// Also create a function to check any user's login
async function testLogin(email, password) {
  const client = await pool.connect();

  try {
    const result = await client.query(
      'SELECT id, email, password, role, first_name, last_name, is_active FROM users WHERE email = $1',
      [email]
    );

    if (result.rows.length === 0) {
      console.log(`❌ User ${email} not found`);
      return;
    }

    const user = result.rows[0];
    console.log('\nUser found:', {
      id: user.id,
      email: user.email,
      role: user.role,
      is_active: user.is_active,
      password_hash_prefix: user.password.substring(0, 30) + '...'
    });

    const isValid = await bcrypt.compare(password, user.password);
    console.log(`🔐 Password test for ${email}:`, isValid ? '✅ CORRECT' : '❌ INCORRECT');

    if (!isValid) {
      console.log('\n💡 Tip: The stored hash was created with different bcrypt settings.');
      console.log('   Generate a new hash using the same salt rounds as your app.');
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    client.release();
    await pool.end();
  }
}

// Run based on command line argument
const command = process.argv[2];

if (command === 'test') {
  const email = process.argv[3] || 'admin@makerere.ac.ug';
  const password = process.argv[4] || 'admin123';
  testLogin(email, password);
} else {
  resetAdminPassword();
}
