import { Client } from 'pg';
import { dbConfig } from '../config';

// Create PostgreSQL client
const client = new Client({
    host: dbConfig.host,
    port: dbConfig.port,
    database: dbConfig.database,
    user: dbConfig.user,
    password: dbConfig.password,
    ssl: dbConfig.ssl,
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
            database: dbConfig.database,
            schemaTable: 'schemaversion',
            execQuery: (query: string) => client.query(query),
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
