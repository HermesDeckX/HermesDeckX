import { readFileSync, writeFileSync } from 'fs';

const locales = ['en','zh','zh-TW','ja','ko','ar','de','es','fr','hi','id','pt-BR','ru'];

const translations = {
  en:      { editor: 'Editor', binaryCannotEdit: 'This file type cannot be edited as text', fileTooLarge: 'File is too large to edit (max 1 MB)', unsavedChanges: 'You have unsaved changes. Discard?', fileSaved: 'File saved', fileConflict: 'File was modified on the server. Please reload and try again.' },
  zh:      { editor: '编辑器', binaryCannotEdit: '此文件类型无法作为文本编辑', fileTooLarge: '文件过大无法编辑（最大 1 MB）', unsavedChanges: '有未保存的更改，确定放弃吗？', fileSaved: '文件已保存', fileConflict: '文件已在服务器上被修改，请重新加载后再试。' },
  'zh-TW': { editor: '編輯器', binaryCannotEdit: '此檔案類型無法作為文字編輯', fileTooLarge: '檔案過大無法編輯（最大 1 MB）', unsavedChanges: '有未儲存的變更，確定捨棄嗎？', fileSaved: '檔案已儲存', fileConflict: '檔案已在伺服器上被修改，請重新載入後再試。' },
  ja:      { editor: 'エディタ', binaryCannotEdit: 'このファイルタイプはテキストとして編集できません', fileTooLarge: 'ファイルが大きすぎて編集できません（最大1MB）', unsavedChanges: '未保存の変更があります。破棄しますか？', fileSaved: 'ファイルを保存しました', fileConflict: 'ファイルはサーバー上で変更されています。再読み込みしてください。' },
  ko:      { editor: '편집기', binaryCannotEdit: '이 파일 형식은 텍스트로 편집할 수 없습니다', fileTooLarge: '파일이 너무 커서 편집할 수 없습니다 (최대 1MB)', unsavedChanges: '저장되지 않은 변경 사항이 있습니다. 버리시겠습니까?', fileSaved: '파일이 저장되었습니다', fileConflict: '파일이 서버에서 수정되었습니다. 다시 로드해 주세요.' },
  ar:      { editor: 'المحرر', binaryCannotEdit: 'لا يمكن تحرير هذا النوع من الملفات كنص', fileTooLarge: 'الملف كبير جدًا للتحرير (الحد الأقصى 1 ميغابايت)', unsavedChanges: 'لديك تغييرات غير محفوظة. هل تريد التجاهل؟', fileSaved: 'تم حفظ الملف', fileConflict: 'تم تعديل الملف على الخادم. يرجى إعادة التحميل والمحاولة مرة أخرى.' },
  de:      { editor: 'Editor', binaryCannotEdit: 'Dieser Dateityp kann nicht als Text bearbeitet werden', fileTooLarge: 'Datei zu groß zum Bearbeiten (max. 1 MB)', unsavedChanges: 'Ungespeicherte Änderungen vorhanden. Verwerfen?', fileSaved: 'Datei gespeichert', fileConflict: 'Die Datei wurde auf dem Server geändert. Bitte neu laden.' },
  es:      { editor: 'Editor', binaryCannotEdit: 'Este tipo de archivo no se puede editar como texto', fileTooLarge: 'El archivo es demasiado grande para editar (máx. 1 MB)', unsavedChanges: '¿Tiene cambios sin guardar. ¿Descartar?', fileSaved: 'Archivo guardado', fileConflict: 'El archivo fue modificado en el servidor. Recargue e intente de nuevo.' },
  fr:      { editor: 'Éditeur', binaryCannotEdit: 'Ce type de fichier ne peut pas être édité en texte', fileTooLarge: 'Fichier trop volumineux pour l\'édition (max 1 Mo)', unsavedChanges: 'Modifications non enregistrées. Abandonner ?', fileSaved: 'Fichier enregistré', fileConflict: 'Le fichier a été modifié sur le serveur. Veuillez recharger.' },
  hi:      { editor: 'संपादक', binaryCannotEdit: 'इस फ़ाइल प्रकार को टेक्स्ट के रूप में संपादित नहीं किया जा सकता', fileTooLarge: 'फ़ाइल संपादन के लिए बहुत बड़ी है (अधिकतम 1 MB)', unsavedChanges: 'असहेजे परिवर्तन हैं। छोड़ दें?', fileSaved: 'फ़ाइल सहेजी गई', fileConflict: 'फ़ाइल सर्वर पर संशोधित हो गई है। कृपया पुनः लोड करें।' },
  id:      { editor: 'Editor', binaryCannotEdit: 'Tipe file ini tidak dapat diedit sebagai teks', fileTooLarge: 'File terlalu besar untuk diedit (maks 1 MB)', unsavedChanges: 'Ada perubahan yang belum disimpan. Buang?', fileSaved: 'File disimpan', fileConflict: 'File telah diubah di server. Silakan muat ulang.' },
  'pt-BR': { editor: 'Editor', binaryCannotEdit: 'Este tipo de arquivo não pode ser editado como texto', fileTooLarge: 'Arquivo muito grande para editar (máx. 1 MB)', unsavedChanges: 'Alterações não salvas. Descartar?', fileSaved: 'Arquivo salvo', fileConflict: 'O arquivo foi modificado no servidor. Recarregue e tente novamente.' },
  ru:      { editor: 'Редактор', binaryCannotEdit: 'Этот тип файла нельзя редактировать как текст', fileTooLarge: 'Файл слишком большой для редактирования (макс. 1 МБ)', unsavedChanges: 'Есть несохранённые изменения. Отменить?', fileSaved: 'Файл сохранён', fileConflict: 'Файл был изменён на сервере. Перезагрузите и попробуйте снова.' },
};

for (const locale of locales) {
  const filePath = `web/locales/${locale}/cm_extra.json`;
  const obj = JSON.parse(readFileSync(filePath, 'utf8'));
  const tp = obj.terminalPage;

  // Add new keys before "run"
  const entries = Object.entries(tp);
  const runIdx = entries.findIndex(([k]) => k === 'run');
  const newEntries = Object.entries(translations[locale]);
  if (runIdx >= 0) {
    entries.splice(runIdx, 0, ...newEntries);
  } else {
    entries.push(...newEntries);
  }
  obj.terminalPage = Object.fromEntries(entries);

  writeFileSync(filePath, JSON.stringify(obj, null, 2) + '\n', 'utf8');
  console.log(`Done: ${locale}`);
}
