import { createClient } from '@libsql/client';

const TURSO_DATABASE_URL = process.env.TURSO_DATABASE_URL;
const TURSO_AUTH_TOKEN = process.env.TURSO_AUTH_TOKEN;

if (!TURSO_DATABASE_URL) {
    throw new Error('TURSO_DATABASE_URL no está configurado en las variables de entorno');
}

if (!TURSO_AUTH_TOKEN) {
    throw new Error('TURSO_AUTH_TOKEN no está configurado en las variables de entorno');
}

export const tursoClient = createClient({
    url: TURSO_DATABASE_URL,
    authToken: TURSO_AUTH_TOKEN
});

/**
 * Verifica la conexión a Turso
 */
export async function testConnection(): Promise<boolean> {
    try {
        await tursoClient.execute('SELECT 1');
        console.log('✅ Conexión a Turso exitosa');
        return true;
    } catch (error) {
        console.error('❌ Error al conectar a Turso:', error);
        return false;
    }
}
