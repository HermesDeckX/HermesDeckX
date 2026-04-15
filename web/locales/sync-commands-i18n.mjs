import { readFileSync, writeFileSync } from 'fs';

const locales = ['en','zh','zh-TW','ja','ko','ar','de','es','fr','hi','id','pt-BR','ru'];

const translations = {
  en:      { processName: 'Process', typeCommand: 'Type a command and press Enter...', send: 'Send', noCommands: 'No command history', unfavorite: 'Unfavorite' },
  zh:      { processName: '进程', typeCommand: '输入命令后按回车发送...', send: '发送', noCommands: '暂无命令历史', unfavorite: '取消收藏' },
  'zh-TW': { processName: '程序', typeCommand: '輸入指令後按 Enter 發送...', send: '發送', noCommands: '暫無指令歷史', unfavorite: '取消收藏' },
  ja:      { processName: 'プロセス', typeCommand: 'コマンドを入力してEnterで送信...', send: '送信', noCommands: 'コマンド履歴なし', unfavorite: 'お気に入り解除' },
  ko:      { processName: '프로세스', typeCommand: '명령어를 입력하고 Enter를 누르세요...', send: '전송', noCommands: '명령 기록 없음', unfavorite: '즐겨찾기 해제' },
  ar:      { processName: 'العملية', typeCommand: 'اكتب أمرًا واضغط Enter...', send: 'إرسال', noCommands: 'لا يوجد سجل أوامر', unfavorite: 'إزالة من المفضلة' },
  de:      { processName: 'Prozess', typeCommand: 'Befehl eingeben und Enter drücken...', send: 'Senden', noCommands: 'Kein Befehlsverlauf', unfavorite: 'Favorit entfernen' },
  es:      { processName: 'Proceso', typeCommand: 'Escribe un comando y presiona Enter...', send: 'Enviar', noCommands: 'Sin historial de comandos', unfavorite: 'Quitar favorito' },
  fr:      { processName: 'Processus', typeCommand: 'Tapez une commande et appuyez sur Entrée...', send: 'Envoyer', noCommands: 'Aucun historique de commandes', unfavorite: 'Retirer des favoris' },
  hi:      { processName: 'प्रक्रिया', typeCommand: 'कमांड टाइप करें और Enter दबाएं...', send: 'भेजें', noCommands: 'कोई कमांड इतिहास नहीं', unfavorite: 'पसंदीदा हटाएं' },
  id:      { processName: 'Proses', typeCommand: 'Ketik perintah dan tekan Enter...', send: 'Kirim', noCommands: 'Tidak ada riwayat perintah', unfavorite: 'Hapus favorit' },
  'pt-BR': { processName: 'Processo', typeCommand: 'Digite um comando e pressione Enter...', send: 'Enviar', noCommands: 'Sem histórico de comandos', unfavorite: 'Remover favorito' },
  ru:      { processName: 'Процесс', typeCommand: 'Введите команду и нажмите Enter...', send: 'Отправить', noCommands: 'Нет истории команд', unfavorite: 'Убрать из избранного' },
};

// Keys to remove (old snippet keys replaced by new ones)
const removeKeys = ['snippetName', 'snippetCommand', 'noSnippets', 'deleteSnippetConfirm'];

for (const locale of locales) {
  const filePath = `web/locales/${locale}/cm_extra.json`;
  const obj = JSON.parse(readFileSync(filePath, 'utf8'));
  const tp = obj.terminalPage;

  // Remove old keys
  for (const k of removeKeys) { delete tp[k]; }

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
