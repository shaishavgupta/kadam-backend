import Postgrator from 'postgrator';
import { Client } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

// Create PostgreSQL client
const client = new Client({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    database: process.env.DB_NAME || 'kadam_db',
    user: process.env.DB_USER || 'postgresng',
    password: process.env.DB_PASS || 'password',
    ssl: process.env.NODE_ENV === 'production' && process.env.DB_HOST !== 'postgres'
        ? { rejectUnauthorized: false }
        : false,
});

const postgrator = new Postgrator({
    migrationPattern: __dirname + '/postgres/migrations/*',
    driver: 'pg',
    database: process.env.DB_NAME || 'kadam_db',
    schemaTable: 'schemaversion',
    execQuery: (query) => client.query(query),
});

async function runMigrations() {
    try {
        // Connect to database
        await client.connect();
        console.log('📊 Connected to PostgreSQL database for migrations');

        // Run migrations
        const applied = await postgrator.migrate();
        console.log('✅ Applied migrations:', applied);

        // Close connection
        await client.end();
        process.exit(0);
    } catch (err) {
        console.error('❌ Migration failed:', err);

        // Ensure client is closed on error
        try {
            await client.end();
        } catch (closeErr) {
            console.error('❌ Error closing database connection:', closeErr);
        }

        process.exit(1);
    }
}

runMigrations();
