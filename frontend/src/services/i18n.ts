import i18next from 'i18next';
import HttpBackend from 'i18next-http-backend';

async function initI18n() {
  await i18next
  .use(HttpBackend)
  .init({
    lng: localStorage.getItem('language') || navigator.language.split('-')[0] || 'en',
    fallbackLng: 'en',
    backend: {
      loadPath: '/locales/{{lng}}/translation.json',
    },
    debug: true,
    interpolation: {
      escapeValue: false, // not needed for react as it escapes by default
    },
  });
}

export const changeLanguage = async (lng: string) => {
  await i18next.changeLanguage(lng);
  localStorage.setItem('language', lng);
};

export { initI18n };
export default i18next;