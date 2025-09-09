// backend/shared/db.ts - Single database definition
import { SQLDatabase } from "encore.dev/storage/sqldb";

export const kadamDB = new SQLDatabase("kadam_db", {
    migrations: "./migrations", // All migrations in one place
});
