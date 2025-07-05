import './style.css';
import { App } from './components/App';
import { initI18n } from './services/i18n';

async function initializeApp() {
  await initI18n();

  const app = new App();
  app.init();
}

initializeApp();

if (import.meta.env.DEV) {
  console.log(`🚀 PONG-CLI initialized`);
  console.log(`📅 Built at: ${new Date().toISOString()}`);
}