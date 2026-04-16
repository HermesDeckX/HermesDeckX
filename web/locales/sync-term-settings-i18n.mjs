import { readFileSync, writeFileSync } from 'fs';

const locales = ['en','zh','zh-TW','ja','ko','ar','de','es','fr','hi','id','pt-BR','ru'];

const translations = {
  en:      { termSettings: 'Terminal Settings', termFontSize: 'Font Size', termTheme: 'Theme', noResults: 'No matching commands' },
  zh:      { termSettings: '终端设置', termFontSize: '字体大小', termTheme: '主题', noResults: '没有匹配的命令' },
  'zh-TW': { termSettings: '終端設定', termFontSize: '字體大小', termTheme: '主題', noResults: '沒有匹配的命令' },
  ja:      { termSettings: 'ターミナル設定', termFontSize: 'フォントサイズ', termTheme: 'テーマ', noResults: '一致するコマンドなし' },
  ko:      { termSettings: '터미널 설정', termFontSize: '글꼴 크기', termTheme: '테마', noResults: '일치하는 명령 없음' },
  ar:      { termSettings: 'إعدادات الطرفية', termFontSize: 'حجم الخط', termTheme: 'السمة', noResults: 'لا توجد أوامر مطابقة' },
  de:      { termSettings: 'Terminal-Einstellungen', termFontSize: 'Schriftgröße', termTheme: 'Thema', noResults: 'Keine passenden Befehle' },
  es:      { termSettings: 'Configuración del terminal', termFontSize: 'Tamaño de fuente', termTheme: 'Tema', noResults: 'Sin comandos coincidentes' },
  fr:      { termSettings: 'Paramètres du terminal', termFontSize: 'Taille de police', termTheme: 'Thème', noResults: 'Aucune commande correspondante' },
  hi:      { termSettings: 'टर्मिनल सेटिंग्स', termFontSize: 'फ़ॉन्ट आकार', termTheme: 'थीम', noResults: 'कोई मिलान आदेश नहीं' },
  id:      { termSettings: 'Pengaturan Terminal', termFontSize: 'Ukuran Font', termTheme: 'Tema', noResults: 'Tidak ada perintah cocok' },
  'pt-BR': { termSettings: 'Configurações do terminal', termFontSize: 'Tamanho da fonte', termTheme: 'Tema', noResults: 'Nenhum comando correspondente' },
  ru:      { termSettings: 'Настройки терминала', termFontSize: 'Размер шрифта', termTheme: 'Тема', noResults: 'Нет совпадающих команд' },
};

for (const locale of locales) {
  const filePath = `web/locales/${locale}/cm_extra.json`;
  const obj = JSON.parse(readFileSync(filePath, 'utf8'));
  const tp = obj.terminalPage;
  const t = translations[locale];
  // Append new keys at end
  tp.termSettings = t.termSettings;
  tp.termFontSize = t.termFontSize;
  tp.termTheme = t.termTheme;
  tp.noResults = t.noResults;
  writeFileSync(filePath, JSON.stringify(obj, null, 2) + '\n', 'utf8');
  console.log(`Done: ${locale}`);
}
