import { Client } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

// Create PostgreSQL client
const client = new Client({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    database: process.env.DB_NAME || 'kadam_db',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'password',
    ssl: process.env.NODE_ENV === 'production' && process.env.DB_HOST !== 'postgres'
        ? { rejectUnauthorized: false }
        : false,
});

async function runMigrations() {
    try {
        // Connect to database
        await client.connect();
        console.log('📊 Connected to PostgreSQL database for migrations');

        // Dynamically import Postgrator (ES module)
        const { default: Postgrator } = await import('postgrator');

        // Create postgrator instance
        const postgrator = new Postgrator({
            migrationPattern: __dirname + '/../../src/db/postgres/migrations/*',
            driver: 'pg',
            database: process.env.DB_NAME || 'kadam_db',
            schemaTable: 'schemaversion',
            execQuery: (query) => client.query(query),
        });

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
