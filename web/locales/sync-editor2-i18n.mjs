import { readFileSync, writeFileSync } from 'fs';

const locales = ['en','zh','zh-TW','ja','ko','ar','de','es','fr','hi','id','pt-BR','ru'];

const translations = {
  en:      { loadingFile: 'Loading file...', savePassword: 'Save Password' },
  zh:      { loadingFile: '正在加载文件...', savePassword: '保存密码' },
  'zh-TW': { loadingFile: '正在載入檔案...', savePassword: '儲存密碼' },
  ja:      { loadingFile: 'ファイルを読み込み中...', savePassword: 'パスワードを保存' },
  ko:      { loadingFile: '파일 로딩 중...', savePassword: '비밀번호 저장' },
  ar:      { loadingFile: 'جاري تحميل الملف...', savePassword: 'حفظ كلمة المرور' },
  de:      { loadingFile: 'Datei wird geladen...', savePassword: 'Passwort speichern' },
  es:      { loadingFile: 'Cargando archivo...', savePassword: 'Guardar contraseña' },
  fr:      { loadingFile: 'Chargement du fichier...', savePassword: 'Enregistrer le mot de passe' },
  hi:      { loadingFile: 'फ़ाइल लोड हो रही है...', savePassword: 'पासवर्ड सहेजें' },
  id:      { loadingFile: 'Memuat file...', savePassword: 'Simpan Kata Sandi' },
  'pt-BR': { loadingFile: 'Carregando arquivo...', savePassword: 'Salvar senha' },
  ru:      { loadingFile: 'Загрузка файла...', savePassword: 'Сохранить пароль' },
};

for (const locale of locales) {
  const filePath = `web/locales/${locale}/cm_extra.json`;
  const obj = JSON.parse(readFileSync(filePath, 'utf8'));
  const tp = obj.terminalPage;

  // Add new keys at the end (before last key)
  const entries = Object.entries(tp);
  const t = translations[locale];
  // Insert loadingFile after fileSaved, savePassword after loadingFile
  const fileSavedIdx = entries.findIndex(([k]) => k === 'fileSaved');
  if (fileSavedIdx >= 0) {
    entries.splice(fileSavedIdx + 1, 0, ['loadingFile', t.loadingFile], ['savePassword', t.savePassword]);
  } else {
    entries.push(['loadingFile', t.loadingFile], ['savePassword', t.savePassword]);
  }
  obj.terminalPage = Object.fromEntries(entries);

  writeFileSync(filePath, JSON.stringify(obj, null, 2) + '\n', 'utf8');
  console.log(`Done: ${locale}`);
}
