import React, { useMemo } from 'react';
import { SectionProps } from '../sectionTypes';
import { ConfigSection } from '../fields';
import { getTranslation } from '../../../locales';

// hermes-agent does not have an auth.* config section like OpenClaw.
// Authentication is handled via env vars (GATEWAY_ALLOW_ALL_USERS, *_ALLOWED_USERS).

export const AuthSection: React.FC<SectionProps> = ({ language }) => {
  const es = useMemo(() => (getTranslation(language) as any).es || {}, [language]);
  return (
    <div className="space-y-4">
      <ConfigSection title={es.auth || 'Authentication'} icon="lock" iconColor="text-red-500">
        <div className="rounded-lg border border-slate-200/60 dark:border-white/[0.06] bg-slate-50/50 dark:bg-white/[0.02] px-3 py-2">
          <p className="text-[10px] theme-text-muted">
            {es.authHint || 'Authentication in hermes-agent is managed through environment variables: GATEWAY_ALLOW_ALL_USERS, TELEGRAM_ALLOWED_USERS, DISCORD_ALLOWED_USERS, etc. Configure them in ~/.hermes/.env.'}
          </p>
        </div>
      </ConfigSection>
    </div>
  );
};
