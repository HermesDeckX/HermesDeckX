import React, { useMemo } from 'react';
import { SectionProps } from '../sectionTypes';
import { ConfigSection } from '../fields';
import { getTranslation } from '../../../locales';

// hermes-agent skills config is in ExtensionsSection.
// This stub is kept for index.tsx compatibility.

export const SkillsSection: React.FC<SectionProps> = ({ language }) => {
  const es = useMemo(() => (getTranslation(language) as any).es || {}, [language]);
  return (
    <div className="space-y-4">
      <ConfigSection title={es.skills || 'Skills'} icon="extension" iconColor="text-violet-500">
        <div className="rounded-lg border border-blue-200/60 dark:border-blue-500/20 bg-blue-50/50 dark:bg-blue-500/5 px-3 py-2">
          <p className="text-[10px] text-blue-700 dark:text-blue-300/80">
            {es.skillsMovedHint || 'Skills configuration has been moved to the Extensions section.'}
          </p>
        </div>
      </ConfigSection>
    </div>
  );
};
