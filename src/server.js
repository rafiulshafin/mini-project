import { createApp } from './app.js';
import { CONFIG } from './config.js';

const app = createApp();

const server = app.listen(CONFIG.PORT, () => {
  console.log(`===============================================`);
  console.log(`🚀 TaskFlow Server is running!`);
  console.log(`📍 Web Dashboard: http://${CONFIG.HOST}:${CONFIG.PORT}`);
  console.log(`📡 Health Check:  http://${CONFIG.HOST}:${CONFIG.PORT}/api/health`);
  console.log(`📑 API Base:      http://${CONFIG.HOST}:${CONFIG.PORT}/api/tasks`);
  console.log(`===============================================`);
});

// Graceful shutdown handling
function handleShutdown(signal) {
  console.log(`\nReceived ${signal}. Shutting down gracefully...`);
  server.close(() => {
    console.log('TaskFlow server closed. Goodbye!');
    process.exit(0);
  });

  setTimeout(() => {
    console.error('Forced shutdown due to timeout.');
    process.exit(1);
  }, 5000);
}

process.on('SIGINT', () => handleShutdown('SIGINT'));
process.on('SIGTERM', () => handleShutdown('SIGTERM'));
