import translationsJson from './translations.json'

// Supported languages based on keys in translations.json
export type Language = keyof typeof translationsJson

// Translation keys
export type TranslationKey = keyof typeof translationsJson.ru

// Translations map
const translations: Record<string, Record<string, string>> = translationsJson

let currentLanguage: Language = 'en'

// Helper to check if a locale is supported
const isSupportedLanguage = (lang: string): lang is Language => {
  return lang in translations
}

// Helper to normalize locale string (e.g. 'ru-RU' -> 'ru')
const normalizeLocale = (locale: string): string => {
  if (!locale) return 'en'
  // Try exact match
  if (isSupportedLanguage(locale)) return locale
  // Try first part (e.g. 'ru' from 'ru-RU')
  const part = locale.split('-')[0]
  if (isSupportedLanguage(part)) return part
  return 'en'
}

export const initLanguage = async () => {
  try {
    const response = await fetch('/api/v4/users/me')
    if (response.ok) {
      const data = await response.json()
      if (data && data.locale) {
        setLanguageFromLocale(data.locale)
        return
      }
    }
  } catch (e) {
    console.warn('Failed to fetch user locale', e)
  }

  // Fallback to HTML lang or browser language
  const htmlLang = document.documentElement.lang
  const browserLang = navigator.language
  
  // Try HTML lang first, then browser lang
  const detectedLang = normalizeLocale(htmlLang) !== 'en' ? normalizeLocale(htmlLang) : normalizeLocale(browserLang)
  
  // We already normalized it, but let's double check if it's supported, otherwise default to 'en'
  if (isSupportedLanguage(detectedLang)) {
    currentLanguage = detectedLang
  } else {
    currentLanguage = 'en'
  }
}

const setLanguageFromLocale = (locale: string) => {
  const normalized = normalizeLocale(locale)
  if (isSupportedLanguage(normalized)) {
    currentLanguage = normalized
  } else {
    currentLanguage = 'en'
  }
}

export const t = (key: TranslationKey): string => {
  const langTrans = translations[currentLanguage]
  const enTrans = translations['en']
  return langTrans?.[key] || enTrans?.[key] || key
}

export const getCurrentLanguage = (): Language => {
  return currentLanguage
}
