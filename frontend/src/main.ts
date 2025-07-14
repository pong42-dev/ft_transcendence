import { App } from './components/App.js';
import { initI18n } from './services/i18n.js';

async function initializeApp() {
  await initI18n();

  const app = new App();
  app.init();
}

initializeApp();

// Development mode logging
console.log(`🚀 PONG-CLI initialized`);
console.log(`📅 Built at: ${new Date().toISOString()}`);