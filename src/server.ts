import 'dotenv/config';
import { createApp } from './app.js';
import { seedData } from './infrastructure/memory/seed.js';

const PORT = process.env.PORT || 3000;

async function startServer() {
  try {
    // Cargar datos iniciales
    await seedData();

    // Crear y arrancar la aplicación
    const app = createApp();

    app.listen(PORT, () => {
      console.log(`🚀 Servidor corriendo en http://localhost:${PORT}`);
      console.log(`📚 Documentación Swagger: http://localhost:${PORT}/api-docs`);
      console.log(`💚 Health check: http://localhost:${PORT}/health`);
      console.log('');
      console.log('✨ Sistema listo para recibir peticiones');
    });
  } catch (error) {
    console.error('❌ Error al iniciar el servidor:', error);
    process.exit(1);
  }
}

startServer();