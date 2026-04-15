import { readFileSync, writeFileSync } from 'fs';

const locales = ['en','zh','zh-TW','ja','ko','ar','de','es','fr','hi','id','pt-BR','ru'];

const translations = {
  en:      { uptimeWeek: 'w', uptimeDay: 'd', uptimeHour: 'h', uptimeMin: 'm' },
  zh:      { uptimeWeek: '周', uptimeDay: '天', uptimeHour: '时', uptimeMin: '分' },
  'zh-TW': { uptimeWeek: '週', uptimeDay: '天', uptimeHour: '時', uptimeMin: '分' },
  ja:      { uptimeWeek: '週', uptimeDay: '日', uptimeHour: '時', uptimeMin: '分' },
  ko:      { uptimeWeek: '주', uptimeDay: '일', uptimeHour: '시', uptimeMin: '분' },
  ar:      { uptimeWeek: 'أ', uptimeDay: 'ي', uptimeHour: 'س', uptimeMin: 'د' },
  de:      { uptimeWeek: 'W', uptimeDay: 'T', uptimeHour: 'Std', uptimeMin: 'Min' },
  es:      { uptimeWeek: 'sem', uptimeDay: 'd', uptimeHour: 'h', uptimeMin: 'min' },
  fr:      { uptimeWeek: 'sem', uptimeDay: 'j', uptimeHour: 'h', uptimeMin: 'min' },
  hi:      { uptimeWeek: 'स', uptimeDay: 'दि', uptimeHour: 'घं', uptimeMin: 'मि' },
  id:      { uptimeWeek: 'mg', uptimeDay: 'hr', uptimeHour: 'j', uptimeMin: 'mnt' },
  'pt-BR': { uptimeWeek: 'sem', uptimeDay: 'd', uptimeHour: 'h', uptimeMin: 'min' },
  ru:      { uptimeWeek: 'нед', uptimeDay: 'д', uptimeHour: 'ч', uptimeMin: 'мин' },
};

for (const locale of locales) {
  const filePath = `web/locales/${locale}/cm_extra.json`;
  const obj = JSON.parse(readFileSync(filePath, 'utf8'));
  const tp = obj.terminalPage;
  const entries = Object.entries(tp);
  const t = translations[locale];
  // Insert after 'processes' key
  const idx = entries.findIndex(([k]) => k === 'processes');
  if (idx >= 0) {
    entries.splice(idx + 1, 0,
      ['uptimeWeek', t.uptimeWeek],
      ['uptimeDay', t.uptimeDay],
      ['uptimeHour', t.uptimeHour],
      ['uptimeMin', t.uptimeMin],
    );
  } else {
    entries.push(
      ['uptimeWeek', t.uptimeWeek],
      ['uptimeDay', t.uptimeDay],
      ['uptimeHour', t.uptimeHour],
      ['uptimeMin', t.uptimeMin],
    );
  }
  obj.terminalPage = Object.fromEntries(entries);
  writeFileSync(filePath, JSON.stringify(obj, null, 2) + '\n', 'utf8');
  console.log(`Done: ${locale}`);
}
