import i18n from "i18next";
import Backend from "i18next-http-backend";
import LanguageDetector from "i18next-browser-languagedetector";
import { initReactI18next } from "react-i18next";

import viLang from "./locales/vi";
import enLang from "./locales/en";
import kmLang from "./locales/km";
import zhLang from "./locales/zh";

const resources = {
  vi: { translation: viLang.app },
  en: { translation: enLang.app },
  km: { translation: kmLang.app },
  zh: { translation: zhLang.app },
};

i18n
  .use(Backend)
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: "vi",
    interpolation: {
      escapeValue: false,
    },
  });

export default i18n;
