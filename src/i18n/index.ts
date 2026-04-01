import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import en from "./en.json";
import zh from "./zh.json";

function normalizeLanguage(lng: string): "en" | "zh" {
  const base = (lng || "en").toLowerCase().split("-")[0];
  return base === "zh" ? "zh" : "en";
}

const savedLanguage = normalizeLanguage(localStorage.getItem("language") || "en");

i18n.use(initReactI18next).init({
  resources: {
    en: { translation: en },
    zh: { translation: zh },
  },
  lng: savedLanguage,
  fallbackLng: "en",
  supportedLngs: ["en", "zh"],
  nonExplicitSupportedLngs: true,
  interpolation: {
    escapeValue: false,
  },
});

export default i18n;
