export const STRINGS = {
  en: {
    smartFormatting: "Smart Formatting", convert: "Convert",
    upload: "Upload document", preview: "Live preview",
    batch: "Batch formatting", aiWriting: "AI writing",
    brandKit: "Brand kit", templates: "My templates",
    versions: "Versions", share: "Share",
  },
  yo: {
    smartFormatting: "Ṣíṣe ọlọ́gbọ́n", convert: "Yí padà",
    upload: "Gbé ìwé wọlé", preview: "Àwòrán tààrà",
    batch: "Ṣíṣe ọ̀pọ̀", aiWriting: "Kíkọ AI",
    brandKit: "Àmì ìdámọ̀", templates: "Àwọn àpẹẹrẹ mi",
    versions: "Àwọn àtúnyẹ̀wò", share: "Pín",
  },
  ha: {
    smartFormatting: "Tsarawa mai wayo", convert: "Maida",
    upload: "Loda takarda", preview: "Dubawa kai tsaye",
    batch: "Tsarawa da yawa", aiWriting: "Rubutun AI",
    brandKit: "Alamar kamfani", templates: "Samfurori na",
    versions: "Sigogi", share: "Raba",
  },
  ar: {
    smartFormatting: "تنسيق ذكي", convert: "تحويل",
    upload: "رفع مستند", preview: "معاينة حية",
    batch: "تنسيق جماعي", aiWriting: "كتابة بالذكاء",
    brandKit: "الهوية", templates: "قوالبي",
    versions: "الإصدارات", share: "مشاركة",
  },
};
export function getStrings(lang = "en") {
  return STRINGS[lang] || STRINGS.en;
}
export function isRTL(lang) {
  return lang === "ar";
}
