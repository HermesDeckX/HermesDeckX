import React, { useMemo } from 'react';
import { SectionProps } from '../sectionTypes';
import { ConfigSection } from '../fields';
import { getTranslation } from '../../../locales';

// hermes-agent browser settings are now in ToolsSection (browser.* paths).
// This section is kept as a redirect stub for index.tsx compatibility.

export const BrowserSection: React.FC<SectionProps> = ({ language }) => {
  const es = useMemo(() => (getTranslation(language) as any).es || {}, [language]);
  return (
    <div className="space-y-4">
      <ConfigSection title={es.browser || 'Browser'} icon="language" iconColor="text-green-500">
        <div className="rounded-lg border border-blue-200/60 dark:border-blue-500/20 bg-blue-50/50 dark:bg-blue-500/5 px-3 py-2">
          <p className="text-[10px] text-blue-700 dark:text-blue-300/80">
            {es.browserMovedHint || 'Browser settings have been moved to the Tools & Terminal section.'}
          </p>
        </div>
      </ConfigSection>
    </div>
  );
};
