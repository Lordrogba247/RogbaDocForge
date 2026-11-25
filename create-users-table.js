import dotenv from 'dotenv';
dotenv.config();
import mysql from 'mysql2/promise';

const DATABASE_URL = "mysql://root:RaxqHhRnfwhhKqaeWQOlTOPJUHxtSqtN@yamanote.proxy.rlwy.net:58594/railway";

async function createUsersTable() {
  let connection;
  try {
    connection = await mysql.createConnection(DATABASE_URL);

    await connection.query(`
      CREATE TABLE IF NOT EXISTS \`users\` (
        \`id\` int AUTO_INCREMENT NOT NULL,
        \`openId\` varchar(64) NOT NULL,
        \`name\` text,
        \`email\` varchar(320),
        \`loginMethod\` varchar(64),
        \`role\` enum('user','admin') DEFAULT 'user' NOT NULL,
        \`createdAt\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
        \`updatedAt\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        \`lastSignedIn\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (\`id\`),
        UNIQUE KEY \`users_openId_unique\` (\`openId\`)
      )
    `);

    console.log('✅ users table created successfully');

    // Verify it exists
    const [rows] = await connection.query("SHOW TABLES LIKE 'users'");
    if (rows.length > 0) {
      console.log('✅ users table confirmed in database');
    }
  } catch (error) {
    console.error('❌ Error creating users table:', error.message);
    process.exit(1);
  } finally {
    if (connection) await connection.end();
  }
}

createUsersTable();