import { Pool } from 'pg';
import { dbConfig } from '../config';

const pool = new Pool({
    host: dbConfig.host,
    port: dbConfig.port,
    database: dbConfig.database,
    user: dbConfig.user,
    password: dbConfig.password,
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
    ssl: dbConfig.ssl,
});

// Test the connection
pool.on('connect', () => {
    console.log('📊 Connected to PostgreSQL database');
});

pool.on('error', (err) => {
    console.error('❌ Database connection error:', err);
});

export const db = {
    query: async (text: string, params?: any[]) => {
        const start = Date.now();
        const res = await pool.query(text, params);
        const duration = Date.now() - start;
        console.log('Executed query', { text, duration, rows: res.rowCount });
        return res;
    },

    queryRow: async (text: string, params?: any[]) => {
        const res = await pool.query(text, params);
        return res.rows[0] || null;
    },

    exec: async (text: string, params?: any[]) => {
        const res = await pool.query(text, params);
        return res;
    }
};

export default pool;
