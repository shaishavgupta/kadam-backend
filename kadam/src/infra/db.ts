import { Pool } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    database: process.env.DB_NAME || 'kadam_db',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'password',
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
    ssl: process.env.NODE_ENV === 'production' && process.env.DB_HOST !== 'postgres' ? { rejectUnauthorized: false } : false,
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
