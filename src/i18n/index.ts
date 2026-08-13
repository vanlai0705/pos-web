import i18n from "i18next"
import LanguageDetector from "i18next-browser-languagedetector"
import Backend from "i18next-http-backend"
import enLang from "./locales/en"
import kmLang from "./locales/km"
import viLang from "./locales/vi"
import zhLang from "./locales/zh"
import { initReactI18next } from "react-i18next"
import { extraResources } from "./extra-resources"
function mergeDeep<T extends Record<string, any>>(base: T, extra: Record<string, any>): T {
  const output: Record<string, any> = { ...base };

  Object.entries(extra).forEach(([key, value]) => {
    if (
      value &&
      typeof value === "object" &&
      !Array.isArray(value) &&
      output[key] &&
      typeof output[key] === "object" &&
      !Array.isArray(output[key])
    ) {
      output[key] = mergeDeep(output[key], value);
      return;
    }

    output[key] = value;
  });

  return output as T;
}

const resources = {
  vi: { translation: mergeDeep(viLang.app, extraResources.vi) },
  en: { translation: mergeDeep(enLang.app, extraResources.en) },
  km: { translation: mergeDeep(kmLang.app, extraResources.km) },
  zh: { translation: mergeDeep(zhLang.app, extraResources.zh) },
};

i18n
  .use(Backend)
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: ["vi", "en"],
    interpolation: {
      escapeValue: false,
    },
  });

export default i18n;
