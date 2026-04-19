import React, { useMemo, useState, useCallback, useEffect } from 'react';
import { SectionProps } from '../sectionTypes';
import { ConfigSection, TextField, PasswordField, SelectField, SwitchField, ArrayField, EmptyState } from '../fields';
import { getTranslation } from '../../../locales';
import { schemaTooltip } from '../schemaTooltip';
import { get, post } from '../../../services/request';
import { channelApi, gatewayApi, pairingApi } from '../../../services/api';
import { useToast } from '../../../components/Toast';
import { copyToClipboard } from '../../../utils/clipboard';

// ============================================================================
// hermes-agent Channel Wizard — 5-step guided configuration
// ============================================================================
// hermes-agent channels are primarily configured via .env vars in ~/.hermes/.env.
// The wizard writes env vars via POST /api/v1/config/channel-wizard and also
// supports config.yaml settings for discord/whatsapp.

// ---------- Channel type definitions ----------

interface ChannelTypeDef {
  id: string;
  labelKey: string;
  descKey: string;
  icon: string;
  category: 'global' | 'china' | 'enterprise' | 'other';
  tokenFields: TokenFieldDef[];
  envDetectKeys: string[];
  hasAccessControl?: boolean;
  prepStepsKey?: string;
  helpUrl?: string;
}

interface TokenFieldDef {
  key: string;
  labelKey: string;
  placeholder?: string;
  secret?: boolean;
  required?: boolean;
}

const CHANNEL_TYPES: ChannelTypeDef[] = [
  {
    id: 'telegram', labelKey: 'telegram', descKey: 'telegramDesc', icon: 'send', category: 'global',
    hasAccessControl: true, helpUrl: 'https://t.me/BotFather',
    envDetectKeys: ['TELEGRAM_BOT_TOKEN'],
    tokenFields: [
      { key: 'botToken', labelKey: 'botToken', placeholder: '123456:ABC-DEF...', secret: true, required: true },
      { key: 'homeChannel', labelKey: 'homeChannel', placeholder: '-100...' },
      { key: 'webhookUrl', labelKey: 'webhookUrl', placeholder: 'https://...' },
      { key: 'webhookPort', labelKey: 'webhookPort', placeholder: '8443' },
      { key: 'webhookSecret', labelKey: 'webhookSecret', secret: true },
    ],
  },
  {
    id: 'discord', labelKey: 'discord', descKey: 'discordDesc', icon: 'sports_esports', category: 'global',
    hasAccessControl: true, helpUrl: 'https://discord.com/developers/applications',
    envDetectKeys: ['DISCORD_BOT_TOKEN'],
    tokenFields: [
      { key: 'token', labelKey: 'token', placeholder: 'MTIz...', secret: true, required: true },
      { key: 'homeChannel', labelKey: 'homeChannel', placeholder: '123456789...' },
    ],
  },
  {
    id: 'slack', labelKey: 'slack', descKey: 'slackDesc', icon: 'tag', category: 'enterprise',
    hasAccessControl: true, helpUrl: 'https://api.slack.com/apps',
    envDetectKeys: ['SLACK_BOT_TOKEN'],
    tokenFields: [
      { key: 'botToken', labelKey: 'botToken', placeholder: 'xoxb-...', secret: true, required: true },
      { key: 'appToken', labelKey: 'appToken', placeholder: 'xapp-...', secret: true, required: true },
    ],
  },
  {
    id: 'whatsapp', labelKey: 'whatsapp', descKey: 'whatsappDesc', icon: 'chat', category: 'global',
    hasAccessControl: true,
    envDetectKeys: ['WHATSAPP_ENABLED'],
    tokenFields: [
      { key: 'mode', labelKey: 'whatsappMode', placeholder: 'bot' },
    ],
  },
  {
    id: 'signal', labelKey: 'signal', descKey: 'signalDesc', icon: 'security', category: 'global',
    hasAccessControl: true,
    envDetectKeys: ['SIGNAL_ACCOUNT'],
    tokenFields: [
      { key: 'account', labelKey: 'account', placeholder: '+1234567890', required: true },
      { key: 'httpUrl', labelKey: 'httpUrl', placeholder: 'http://localhost:8080' },
    ],
  },
  {
    id: 'mattermost', labelKey: 'mattermost', descKey: 'mattermostDesc', icon: 'chat_bubble', category: 'enterprise',
    hasAccessControl: true,
    envDetectKeys: ['MATTERMOST_TOKEN'],
    tokenFields: [
      { key: 'serverUrl', labelKey: 'serverUrl', placeholder: 'https://mattermost.example.com', required: true },
      { key: 'botToken', labelKey: 'botToken', secret: true, required: true },
      { key: 'homeChannel', labelKey: 'homeChannel', placeholder: 'town-square' },
    ],
  },
  {
    id: 'matrix', labelKey: 'matrix', descKey: 'matrixDesc', icon: 'hub', category: 'other',
    hasAccessControl: true,
    envDetectKeys: ['MATRIX_ACCESS_TOKEN', 'MATRIX_HOMESERVER'],
    tokenFields: [
      { key: 'homeserver', labelKey: 'homeserver', placeholder: 'https://matrix.org', required: true },
      { key: 'accessToken', labelKey: 'accessToken', secret: true, required: true },
      { key: 'userId', labelKey: 'userId', placeholder: '@bot:matrix.org' },
      { key: 'password', labelKey: 'password', secret: true },
    ],
  },
  {
    id: 'dingtalk', labelKey: 'dingtalk', descKey: 'dingtalkDesc', icon: 'notifications', category: 'china',
    envDetectKeys: ['DINGTALK_CLIENT_ID'],
    tokenFields: [
      { key: 'clientId', labelKey: 'clientId', required: true },
      { key: 'clientSecret', labelKey: 'clientSecret', secret: true, required: true },
    ],
  },
  {
    id: 'feishu', labelKey: 'feishu', descKey: 'feishuDesc', icon: 'apartment', category: 'china',
    envDetectKeys: ['FEISHU_APP_ID'],
    tokenFields: [
      { key: 'appId', labelKey: 'appId', required: true },
      { key: 'appSecret', labelKey: 'appSecret', secret: true, required: true },
      { key: 'encryptKey', labelKey: 'encryptKey', secret: true },
      { key: 'verificationToken', labelKey: 'verificationToken', secret: true },
    ],
  },
  {
    id: 'wecom', labelKey: 'wecom', descKey: 'wecomDesc', icon: 'business', category: 'china',
    hasAccessControl: true,
    envDetectKeys: ['WECOM_BOT_ID'],
    tokenFields: [
      { key: 'botId', labelKey: 'botId', required: true },
      { key: 'secret', labelKey: 'secret', secret: true, required: true },
    ],
  },
  {
    id: 'wecom_callback', labelKey: 'wecomCallback', descKey: 'wecomCallbackDesc', icon: 'contact_phone', category: 'china',
    hasAccessControl: true,
    envDetectKeys: ['WECOM_CALLBACK_CORP_ID'],
    tokenFields: [
      { key: 'corpId', labelKey: 'corpId', required: true },
      { key: 'corpSecret', labelKey: 'corpSecret', secret: true, required: true },
      { key: 'agentId', labelKey: 'agentId' },
      { key: 'token', labelKey: 'token', secret: true },
      { key: 'encodingAesKey', labelKey: 'encodingAesKey', secret: true },
    ],
  },
  {
    id: 'weixin', labelKey: 'wechat', descKey: 'weixinDesc', icon: 'mark_chat_unread', category: 'china',
    hasAccessControl: true,
    envDetectKeys: ['WEIXIN_ACCOUNT_ID'],
    tokenFields: [
      { key: 'accountId', labelKey: 'accountId' },
      { key: 'token', labelKey: 'token', secret: true },
      { key: 'baseUrl', labelKey: 'baseUrl' },
      { key: 'homeChannel', labelKey: 'homeChannel' },
    ],
  },
  {
    id: 'bluebubbles', labelKey: 'bluebubbles', descKey: 'bluebubblesDesc', icon: 'sms', category: 'global',
    envDetectKeys: ['BLUEBUBBLES_SERVER_URL'],
    tokenFields: [
      { key: 'serverUrl', labelKey: 'serverUrl', placeholder: 'http://localhost:1234', required: true },
      { key: 'password', labelKey: 'password', secret: true, required: true },
    ],
  },
  {
    id: 'sms', labelKey: 'sms', descKey: 'smsDesc', icon: 'textsms', category: 'global',
    hasAccessControl: true,
    envDetectKeys: ['TWILIO_ACCOUNT_SID'],
    tokenFields: [
      { key: 'accountSid', labelKey: 'accountSid', required: true },
      { key: 'authToken', labelKey: 'authToken', secret: true, required: true },
      { key: 'phoneNumber', labelKey: 'phoneNumber', placeholder: '+1...' },
    ],
  },
  {
    id: 'email', labelKey: 'email', descKey: 'emailDesc', icon: 'email', category: 'other',
    hasAccessControl: true,
    envDetectKeys: ['EMAIL_ADDRESS'],
    tokenFields: [
      { key: 'address', labelKey: 'emailAddress', required: true },
      { key: 'password', labelKey: 'password', secret: true, required: true },
      { key: 'imapHost', labelKey: 'imapHost' },
      { key: 'imapPort', labelKey: 'imapPort', placeholder: '993' },
      { key: 'smtpHost', labelKey: 'smtpHost' },
      { key: 'smtpPort', labelKey: 'smtpPort', placeholder: '587' },
    ],
  },
  {
    id: 'homeassistant', labelKey: 'homeAssistant', descKey: 'homeAssistantDesc', icon: 'home', category: 'other',
    envDetectKeys: ['HASS_TOKEN'],
    tokenFields: [
      { key: 'hassToken', labelKey: 'hassToken', secret: true, required: true },
      { key: 'hassUrl', labelKey: 'hassUrl', placeholder: 'http://homeassistant.local:8123' },
    ],
  },
  {
    id: 'qqbot', labelKey: 'qqbot', descKey: 'qqbotDesc', icon: 'forum', category: 'china',
    hasAccessControl: true, helpUrl: 'https://q.qq.com/qqbot/',
    envDetectKeys: ['QQ_APP_ID'],
    tokenFields: [
      { key: 'appId', labelKey: 'appId', placeholder: '102012345', required: true },
      { key: 'clientSecret', labelKey: 'clientSecret', secret: true, required: true },
      { key: 'homeChannel', labelKey: 'homeChannel', placeholder: 'guild_id or channel_id' },
      { key: 'sttApiKey', labelKey: 'sttApiKey', secret: true },
      { key: 'sttBaseUrl', labelKey: 'sttBaseUrl', placeholder: 'https://api.openai.com/v1' },
      { key: 'sttModel', labelKey: 'sttModel', placeholder: 'whisper-1' },
    ],
  },
  {
    id: 'api_server', labelKey: 'apiServer', descKey: 'apiServerDesc', icon: 'api', category: 'other',
    envDetectKeys: ['API_SERVER_ENABLED'],
    tokenFields: [
      { key: 'apiKey', labelKey: 'apiKey', secret: true },
      { key: 'port', labelKey: 'port', placeholder: '8642' },
      { key: 'host', labelKey: 'host', placeholder: '127.0.0.1' },
    ],
  },
];

const CATEGORY_ORDER = ['global', 'china', 'enterprise', 'other'] as const;
const CATEGORY_KEYS: Record<string, string> = { global: 'catGlobal', china: 'catChina', enterprise: 'catEnterprise', other: 'catOther' };
const CATEGORY_ICONS: Record<string, string> = { global: 'public', china: 'language', enterprise: 'business', other: 'more_horiz' };

// ============================================================================
// Accordion Step (shared with ModelsSection — identical to ClawDeckX)
// ============================================================================
interface AccordionStepProps {
  stepNum: number;
  icon: string;
  title: string;
  summary?: string;
  open: boolean;
  done: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}

const AccordionStep: React.FC<AccordionStepProps> = ({ stepNum, icon, title, summary, open, done, onToggle, children }) => (
  <div className={`border rounded-xl transition-colors ${open ? 'overflow-visible border-primary/40 theme-panel' : 'overflow-hidden ' + (done ? 'border-green-300 dark:border-green-500/30 bg-green-50/50 dark:bg-green-500/5' : 'border-slate-200 dark:border-white/[0.06] theme-panel')}`}>
    <div className={`flex items-center gap-2.5 px-4 py-3 cursor-pointer transition-colors ${open ? '' : 'hover:bg-slate-100 dark:hover:bg-white/[0.03]'}`} onClick={onToggle}>
      <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold shrink-0 ${done ? 'bg-green-500 text-white' : open ? 'bg-primary text-white' : 'theme-field theme-text-muted'}`}>
        {done ? <span className="material-symbols-outlined text-[14px]">check</span> : stepNum}
      </div>
      <span className={`material-symbols-outlined text-[16px] ${done ? 'text-green-500' : open ? 'text-primary' : 'theme-text-muted'}`}>{icon}</span>
      <div className="flex-1 min-w-0">
        <span className={`text-xs font-bold ${open ? 'text-[var(--color-text)] dark:text-white' : 'theme-text-secondary'}`}>{title}</span>
        {!open && summary && <p className="text-[10px] theme-text-muted truncate">{summary}</p>}
      </div>
      <span className={`material-symbols-outlined text-[16px] theme-text-muted transition-transform ${open ? 'rotate-180' : ''}`}>expand_more</span>
    </div>
    {open && <div className="px-4 pb-4 border-t border-slate-100 dark:border-white/[0.04]">{children}</div>}
  </div>
);

// Validate channel config (minimal for hermes-agent — env-var based)
export const validateChannelsConfig = (_config: Record<string, any>, _es: any): { channel: string; account: string; fields: string[] }[] => [];

// ---------- Main Component ----------

// Reverse mapping: env var key → { channelId, tokenFieldKey }
// Built from buildChannelEnvVars logic in the backend.
const ENV_TO_TOKEN: Record<string, { ch: string; key: string }> = {
  TELEGRAM_BOT_TOKEN: { ch: 'telegram', key: 'botToken' },
  TELEGRAM_ALLOWED_USERS: { ch: 'telegram', key: '_allowFrom' },
  TELEGRAM_HOME_CHANNEL: { ch: 'telegram', key: 'homeChannel' },
  TELEGRAM_WEBHOOK_URL: { ch: 'telegram', key: 'webhookUrl' },
  TELEGRAM_WEBHOOK_PORT: { ch: 'telegram', key: 'webhookPort' },
  TELEGRAM_WEBHOOK_SECRET: { ch: 'telegram', key: 'webhookSecret' },
  DISCORD_BOT_TOKEN: { ch: 'discord', key: 'token' },
  DISCORD_ALLOWED_USERS: { ch: 'discord', key: '_allowFrom' },
  DISCORD_HOME_CHANNEL: { ch: 'discord', key: 'homeChannel' },
  SLACK_BOT_TOKEN: { ch: 'slack', key: 'botToken' },
  SLACK_APP_TOKEN: { ch: 'slack', key: 'appToken' },
  SLACK_ALLOWED_USERS: { ch: 'slack', key: '_allowFrom' },
  WHATSAPP_ENABLED: { ch: 'whatsapp', key: '_enabled' },
  WHATSAPP_MODE: { ch: 'whatsapp', key: 'mode' },
  WHATSAPP_ALLOWED_USERS: { ch: 'whatsapp', key: '_allowFrom' },
  SIGNAL_ACCOUNT: { ch: 'signal', key: 'account' },
  SIGNAL_HTTP_URL: { ch: 'signal', key: 'httpUrl' },
  SIGNAL_ALLOWED_USERS: { ch: 'signal', key: '_allowFrom' },
  MATTERMOST_URL: { ch: 'mattermost', key: 'serverUrl' },
  MATTERMOST_TOKEN: { ch: 'mattermost', key: 'botToken' },
  MATTERMOST_ALLOWED_USERS: { ch: 'mattermost', key: '_allowFrom' },
  MATTERMOST_HOME_CHANNEL: { ch: 'mattermost', key: 'homeChannel' },
  MATRIX_HOMESERVER: { ch: 'matrix', key: 'homeserver' },
  MATRIX_ACCESS_TOKEN: { ch: 'matrix', key: 'accessToken' },
  MATRIX_USER_ID: { ch: 'matrix', key: 'userId' },
  MATRIX_PASSWORD: { ch: 'matrix', key: 'password' },
  MATRIX_ALLOWED_USERS: { ch: 'matrix', key: '_allowFrom' },
  DINGTALK_CLIENT_ID: { ch: 'dingtalk', key: 'clientId' },
  DINGTALK_CLIENT_SECRET: { ch: 'dingtalk', key: 'clientSecret' },
  FEISHU_APP_ID: { ch: 'feishu', key: 'appId' },
  FEISHU_APP_SECRET: { ch: 'feishu', key: 'appSecret' },
  FEISHU_ENCRYPT_KEY: { ch: 'feishu', key: 'encryptKey' },
  FEISHU_VERIFICATION_TOKEN: { ch: 'feishu', key: 'verificationToken' },
  WECOM_BOT_ID: { ch: 'wecom', key: 'botId' },
  WECOM_SECRET: { ch: 'wecom', key: 'secret' },
  WECOM_ALLOWED_USERS: { ch: 'wecom', key: '_allowFrom' },
  WECOM_CALLBACK_CORP_ID: { ch: 'wecom_callback', key: 'corpId' },
  WECOM_CALLBACK_CORP_SECRET: { ch: 'wecom_callback', key: 'corpSecret' },
  WECOM_CALLBACK_AGENT_ID: { ch: 'wecom_callback', key: 'agentId' },
  WECOM_CALLBACK_TOKEN: { ch: 'wecom_callback', key: 'token' },
  WECOM_CALLBACK_ENCODING_AES_KEY: { ch: 'wecom_callback', key: 'encodingAesKey' },
  WECOM_CALLBACK_ALLOWED_USERS: { ch: 'wecom_callback', key: '_allowFrom' },
  WEIXIN_ACCOUNT_ID: { ch: 'weixin', key: 'accountId' },
  WEIXIN_TOKEN: { ch: 'weixin', key: 'token' },
  WEIXIN_BASE_URL: { ch: 'weixin', key: 'baseUrl' },
  WEIXIN_HOME_CHANNEL: { ch: 'weixin', key: 'homeChannel' },
  BLUEBUBBLES_SERVER_URL: { ch: 'bluebubbles', key: 'serverUrl' },
  BLUEBUBBLES_PASSWORD: { ch: 'bluebubbles', key: 'password' },
  // QQ Bot v2 (Official API)
  QQ_APP_ID: { ch: 'qqbot', key: 'appId' },
  QQ_CLIENT_SECRET: { ch: 'qqbot', key: 'clientSecret' },
  QQ_HOME_CHANNEL: { ch: 'qqbot', key: 'homeChannel' },
  QQ_HOME_CHANNEL_NAME: { ch: 'qqbot', key: 'homeChannelName' },
  QQ_ALLOWED_USERS: { ch: 'qqbot', key: '_allowFrom' },
  QQ_GROUP_ALLOWED_USERS: { ch: 'qqbot', key: 'groupAllowedUsers' },
  QQ_ALLOW_ALL_USERS: { ch: 'qqbot', key: 'allowAllUsers' },
  QQ_MARKDOWN_SUPPORT: { ch: 'qqbot', key: 'markdownSupport' },
  QQ_STT_API_KEY: { ch: 'qqbot', key: 'sttApiKey' },
  QQ_STT_BASE_URL: { ch: 'qqbot', key: 'sttBaseUrl' },
  QQ_STT_MODEL: { ch: 'qqbot', key: 'sttModel' },
  TWILIO_ACCOUNT_SID: { ch: 'sms', key: 'accountSid' },
  TWILIO_AUTH_TOKEN: { ch: 'sms', key: 'authToken' },
  TWILIO_PHONE_NUMBER: { ch: 'sms', key: 'phoneNumber' },
  SMS_ALLOWED_USERS: { ch: 'sms', key: '_allowFrom' },
  EMAIL_ADDRESS: { ch: 'email', key: 'address' },
  EMAIL_PASSWORD: { ch: 'email', key: 'password' },
  EMAIL_IMAP_HOST: { ch: 'email', key: 'imapHost' },
  EMAIL_IMAP_PORT: { ch: 'email', key: 'imapPort' },
  EMAIL_SMTP_HOST: { ch: 'email', key: 'smtpHost' },
  EMAIL_SMTP_PORT: { ch: 'email', key: 'smtpPort' },
  EMAIL_ALLOWED_USERS: { ch: 'email', key: '_allowFrom' },
  HASS_TOKEN: { ch: 'homeassistant', key: 'hassToken' },
  HASS_URL: { ch: 'homeassistant', key: 'hassUrl' },
  API_SERVER_ENABLED: { ch: 'api_server', key: '_enabled' },
  API_SERVER_KEY: { ch: 'api_server', key: 'apiKey' },
  API_SERVER_PORT: { ch: 'api_server', key: 'port' },
  API_SERVER_HOST: { ch: 'api_server', key: 'host' },
  // Home channel names
  TELEGRAM_HOME_CHANNEL_NAME: { ch: 'telegram', key: 'homeChannelName' },
  DISCORD_HOME_CHANNEL_NAME: { ch: 'discord', key: 'homeChannelName' },
  SLACK_HOME_CHANNEL: { ch: 'slack', key: 'homeChannel' },
  SLACK_HOME_CHANNEL_NAME: { ch: 'slack', key: 'homeChannelName' },
  SIGNAL_HOME_CHANNEL: { ch: 'signal', key: 'homeChannel' },
  SIGNAL_HOME_CHANNEL_NAME: { ch: 'signal', key: 'homeChannelName' },
  EMAIL_HOME_ADDRESS: { ch: 'email', key: 'homeChannel' },
  EMAIL_HOME_ADDRESS_NAME: { ch: 'email', key: 'homeChannelName' },
  SMS_HOME_CHANNEL: { ch: 'sms', key: 'homeChannel' },
  SMS_HOME_CHANNEL_NAME: { ch: 'sms', key: 'homeChannelName' },
  MATRIX_HOME_ROOM: { ch: 'matrix', key: 'homeChannel' },
  MATRIX_HOME_ROOM_NAME: { ch: 'matrix', key: 'homeChannelName' },
  // Reply-to mode
  TELEGRAM_REPLY_TO_MODE: { ch: 'telegram', key: 'replyToMode' },
  DISCORD_REPLY_TO_MODE: { ch: 'discord', key: 'replyToMode' },
  // Require mention
  TELEGRAM_REQUIRE_MENTION: { ch: 'telegram', key: 'requireMention' },
  DISCORD_REQUIRE_MENTION: { ch: 'discord', key: 'requireMention' },
  SLACK_REQUIRE_MENTION: { ch: 'slack', key: 'requireMention' },
  WHATSAPP_REQUIRE_MENTION: { ch: 'whatsapp', key: 'requireMention' },
  MATRIX_REQUIRE_MENTION: { ch: 'matrix', key: 'requireMention' },
  // DM / Group policies
  WHATSAPP_DM_POLICY: { ch: 'whatsapp', key: 'dmPolicy' },
  WEIXIN_DM_POLICY: { ch: 'weixin', key: 'dmPolicy' },
  // BlueBubbles extras
  BLUEBUBBLES_WEBHOOK_PORT: { ch: 'bluebubbles', key: 'webhookPort' },
  // API Server extras
  API_SERVER_CORS_ORIGINS: { ch: 'api_server', key: 'corsOrigins' },
};

// Channels that support DM pairing
const PAIRING_CHANNELS = new Set(['telegram', 'discord', 'slack', 'signal', 'whatsapp', 'weixin', 'mattermost', 'matrix', 'wecom', 'wecom_callback', 'email', 'sms', 'bluebubbles', 'qqbot']);

// Channels that support home channel
const HOME_CHANNEL_CHANNELS = new Set(['telegram', 'discord', 'slack', 'signal', 'mattermost', 'matrix', 'weixin', 'email', 'sms', 'qqbot']);

// Channels that support reply-to-mode
const REPLY_TO_CHANNELS = new Set(['telegram', 'discord']);

// Channels that support require-mention
const MENTION_CHANNELS = new Set(['telegram', 'discord', 'slack', 'whatsapp', 'matrix']);

// i18n option helpers
const dmPolicyOptions = (cw: any) => [
  { value: 'pairing', label: cw.pairing || 'Pairing' },
  { value: 'allowlist', label: cw.allowlist || 'Allowlist' },
  { value: 'open', label: cw.open || 'Open' },
  { value: 'disabled', label: cw.disabled || 'Disabled' },
];
const replyToOptions = (cw: any) => [
  { value: '', label: cw.optDefault || 'Default' },
  { value: 'off', label: cw.optOff || 'Off' },
  { value: 'first', label: cw.optFirst || 'First' },
  { value: 'all', label: cw.optAll || 'All' },
];

// Per-platform channel_prompts editor (hermes-agent v0.10.0+).
// Stores a map { channelId/topicId -> ephemeral system prompt }.
const ChannelPromptsField: React.FC<{
  platform: string;
  getField: (path: (string | number)[]) => any;
  setField: (path: (string | number)[], value: any) => void;
  tip: (key: string) => any;
  es: any;
}> = ({ platform, getField, setField, tip, es }) => {
  const map = (getField([platform, 'channel_prompts']) || {}) as Record<string, string>;
  const [newKey, setNewKey] = useState('');
  const [newVal, setNewVal] = useState('');
  const entries = Object.entries(map);
  const updateMap = (next: Record<string, string>) => {
    const cur = getField([platform]) || {};
    setField([platform], { ...cur, channel_prompts: Object.keys(next).length ? next : undefined });
  };
  return (
    <div className="pt-2 space-y-2">
      <div className="flex items-start gap-2">
        <span className="material-symbols-outlined text-[14px] text-primary mt-0.5">edit_note</span>
        <div className="flex-1 min-w-0">
          <div className="text-[11px] font-bold theme-text-secondary">
            {es.channelPrompts || 'Per-Channel Prompts'}
          </div>
          <p className="text-[10px] theme-text-muted mt-0.5" title={tip(`${platform}.channel_prompts`)}>
            {es.channelPromptsDesc || 'Override the system prompt per channel/topic. For forums, the parent channel applies to child threads.'}
          </p>
        </div>
      </div>
      {entries.length > 0 && (
        <div className="space-y-1">
          {entries.map(([k, v]) => (
            <div key={k} className="flex items-start gap-1 p-2 rounded-md bg-slate-50 dark:bg-white/[0.02] border border-slate-200/60 dark:border-white/[0.06]">
              <input
                type="text"
                value={k}
                readOnly
                className="w-40 shrink-0 px-2 py-1 text-[10px] font-mono rounded bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-600 dark:text-white/70"
              />
              <textarea
                value={v}
                onChange={e => updateMap({ ...map, [k]: e.target.value })}
                rows={2}
                className="flex-1 px-2 py-1 text-[10px] rounded bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 focus:outline-none focus:ring-1 focus:ring-primary"
              />
              <button
                onClick={() => { const next = { ...map }; delete next[k]; updateMap(next); }}
                className="p-1 rounded text-slate-400 hover:text-red-500 hover:bg-red-500/10"
                title={es.remove || 'Remove'}
              >
                <span className="material-symbols-outlined text-[12px]">delete</span>
              </button>
            </div>
          ))}
        </div>
      )}
      <div className="flex items-start gap-1">
        <input
          type="text"
          value={newKey}
          onChange={e => setNewKey(e.target.value)}
          placeholder={es.channelPromptsIdPlaceholder || 'channel / topic id'}
          className="w-40 shrink-0 px-2 py-1 text-[10px] font-mono rounded bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 focus:outline-none focus:ring-1 focus:ring-primary"
        />
        <textarea
          value={newVal}
          onChange={e => setNewVal(e.target.value)}
          rows={2}
          placeholder={es.channelPromptsTextPlaceholder || 'Ephemeral system prompt…'}
          className="flex-1 px-2 py-1 text-[10px] rounded bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 focus:outline-none focus:ring-1 focus:ring-primary"
        />
        <button
          onClick={() => { if (!newKey.trim()) return; updateMap({ ...map, [newKey.trim()]: newVal }); setNewKey(''); setNewVal(''); }}
          className="px-2 py-1 rounded text-[10px] font-bold bg-primary text-white hover:bg-primary/90 disabled:opacity-40"
          disabled={!newKey.trim()}
        >
          {es.add || 'Add'}
        </button>
      </div>
    </div>
  );
};

// Collapsible field group component — matches ClawDeckX's ConfigSection style
const FieldGroup: React.FC<{
  icon: string;
  title: string;
  iconColor?: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}> = ({ icon, title, iconColor = 'text-primary', defaultOpen = false, children }) => {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border border-slate-200/60 dark:border-white/[0.06] rounded-lg overflow-hidden">
      <div className="flex items-center gap-2 px-3 py-2 cursor-pointer hover:bg-slate-50 dark:hover:bg-white/[0.02] transition-colors" onClick={() => setOpen(!open)}>
        <span className={`material-symbols-outlined text-[14px] ${iconColor}`}>{icon}</span>
        <span className="text-[11px] font-bold theme-text-secondary flex-1">{title}</span>
        <span className={`material-symbols-outlined text-[14px] theme-text-muted transition-transform ${open ? 'rotate-180' : ''}`}>expand_more</span>
      </div>
      {open && <div className="px-3 pb-3 pt-1 border-t border-slate-100 dark:border-white/[0.04] space-y-1">{children}</div>}
    </div>
  );
};

export const ChannelsSection: React.FC<SectionProps> = ({ config, schema, setField, getField, language }) => {
  const es = useMemo(() => (getTranslation(language) as any).es || {}, [language]);
  const cw = useMemo(() => (getTranslation(language) as any).cw || {}, [language]);
  const tip = (key: string) => schemaTooltip(key, language, schema);
  const { toast } = useToast();

  // Env vars from backend (for detecting configured channels)
  const [envVars, setEnvVars] = useState<Record<string, string>>({});
  const [envLoading, setEnvLoading] = useState(true);

  const loadEnvVars = useCallback(async () => {
    try {
      const res = await get<{ vars: Record<string, string> }>('/api/v1/setup/env-vars');
      if (res?.vars) setEnvVars(res.vars);
    } catch { /* ignore */ }
    setEnvLoading(false);
  }, []);

  useEffect(() => { loadEnvVars(); }, [loadEnvVars]);

  // Check which channels are configured
  const configuredChannels = useMemo(() => {
    const set = new Set<string>();
    for (const ch of CHANNEL_TYPES) {
      for (const key of ch.envDetectKeys) {
        if (envVars[key] && envVars[key] !== '' && envVars[key] !== 'false') {
          set.add(ch.id);
          break;
        }
      }
    }
    return set;
  }, [envVars]);

  // ── Configured channel card state ──
  const [expandedCard, setExpandedCard] = useState<string | null>(null);
  const [cardTokens, setCardTokens] = useState<Record<string, string>>({});
  const [cardSaving, setCardSaving] = useState(false);
  const [cardSaveResult, setCardSaveResult] = useState<{ ok: boolean; msg: string } | null>(null);
  const [restarting, setRestarting] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [pairingChannel, setPairingChannel] = useState<string | null>(null);
  const [pairingCode, setPairingCode] = useState('');
  const [pairingStatus, setPairingStatus] = useState<'idle' | 'approving' | 'success' | 'error'>('idle');
  const [pairingError, setPairingError] = useState('');
  const [cardTestStatus, setCardTestStatus] = useState<'idle' | 'testing' | 'ok' | 'fail'>('idle');
  const [cardTestMsg, setCardTestMsg] = useState('');

  // Load raw env vars for a channel when expanding card
  const loadCardTokens = useCallback(async (chId: string) => {
    try {
      const res = await channelApi.envVarsRaw();
      if (!res?.vars) return;
      const tokens: Record<string, string> = {};
      for (const [envKey, val] of Object.entries(res.vars)) {
        const mapping = ENV_TO_TOKEN[envKey];
        if (mapping && mapping.ch === chId) {
          tokens[mapping.key] = val;
        }
      }
      setCardTokens(tokens);
    } catch { /* ignore */ }
  }, []);

  const toggleCard = useCallback((chId: string) => {
    if (expandedCard === chId) {
      setExpandedCard(null);
      setCardTokens({});
      setCardSaveResult(null);
      setCardTestStatus('idle');
      setCardTestMsg('');
    } else {
      setExpandedCard(chId);
      setCardSaveResult(null);
      setCardTestStatus('idle');
      setCardTestMsg('');
      loadCardTokens(chId);
    }
  }, [expandedCard, loadCardTokens]);

  // Save edited channel (reuse the wizard save API)
  const handleCardSave = useCallback(async (chId: string) => {
    setCardSaving(true);
    setCardSaveResult(null);
    try {
      // Separate out special fields from token fields
      const { _allowFrom, dmPolicy, requireMention, homeChannelName, replyToMode, ...pureTokens } = cardTokens;
      const allowFromArr = _allowFrom ? _allowFrom.split(',').map((s: string) => s.trim()).filter(Boolean) : [];
      await post('/api/v1/config/channel-wizard', {
        channel: chId,
        tokens: pureTokens,
        dmPolicy: dmPolicy || 'pairing',
        allowFrom: allowFromArr,
        requireMention: requireMention === 'true',
        // Extra env vars the backend writes directly
        extraEnv: {
          ...(homeChannelName ? { [`${chId.toUpperCase().replace(/-/g, '_')}_HOME_CHANNEL_NAME`]: homeChannelName } : {}),
          ...(replyToMode ? { [`${chId.toUpperCase().replace(/-/g, '_')}_REPLY_TO_MODE`]: replyToMode } : {}),
        },
      });
      setCardSaveResult({ ok: true, msg: 'ok' });
      // Restart gateway after save
      setRestarting(true);
      try { await gatewayApi.restart(); } catch { /* ignore */ }
      setRestarting(false);
      await loadEnvVars();
    } catch (e: any) {
      setCardSaveResult({ ok: false, msg: e?.message || 'Save failed' });
    }
    setCardSaving(false);
  }, [cardTokens, loadEnvVars]);

  // Test connection for configured card
  const handleCardTest = useCallback(async (chId: string) => {
    setCardTestStatus('testing');
    setCardTestMsg('');
    try {
      const res = await post<{ status: string; message: string }>('/api/v1/setup/test-channel', {
        channel: chId,
        tokens: cardTokens,
      });
      if (res?.status === 'ok') {
        setCardTestStatus('ok');
        setCardTestMsg(res.message || '');
      } else {
        setCardTestStatus('fail');
        setCardTestMsg(res?.message || 'Unknown error');
      }
    } catch (e: any) {
      setCardTestStatus('fail');
      setCardTestMsg(e?.message || 'Request failed');
    }
    setTimeout(() => { setCardTestStatus('idle'); setCardTestMsg(''); }, 5000);
  }, [cardTokens]);

  // Delete channel
  const handleDeleteChannel = useCallback(async (chId: string) => {
    setDeleting(true);
    try {
      await channelApi.deleteChannel(chId);
      setDeleteConfirm(null);
      setExpandedCard(null);
      // Restart gateway after delete
      setRestarting(true);
      try { await gatewayApi.restart(); } catch { /* ignore */ }
      setRestarting(false);
      await loadEnvVars();
    } catch { /* ignore */ }
    setDeleting(false);
  }, [loadEnvVars]);

  // Pairing approve
  const handleApprovePairing = useCallback(async (chId: string) => {
    if (!pairingCode.trim()) return;
    setPairingStatus('approving');
    setPairingError('');
    try {
      await pairingApi.approve(chId, pairingCode.trim());
      setPairingStatus('success');
      setTimeout(() => { setPairingChannel(null); setPairingCode(''); setPairingStatus('idle'); }, 1500);
    } catch (err: any) {
      setPairingStatus('error');
      setPairingError(err?.message || 'Failed');
    }
  }, [pairingCode]);

  // Wizard state
  const [addingChannel, setAddingChannel] = useState<string | null>(null);
  const [wizardStep, setWizardStep] = useState(0); // 0=select, 1=prep, 2=creds, 3=access, 4=confirm
  const [wizTokens, setWizTokens] = useState<Record<string, string>>({});
  const [wizDmPolicy, setWizDmPolicy] = useState('pairing');
  const [wizAllowFrom, setWizAllowFrom] = useState<string[]>([]);
  const [wizRequireMention, setWizRequireMention] = useState(false);

  // Test connection state
  const [testStatus, setTestStatus] = useState<'idle' | 'testing' | 'ok' | 'fail'>('idle');
  const [testMsg, setTestMsg] = useState('');

  // Save state
  const [saving, setSaving] = useState(false);
  const [saveResult, setSaveResult] = useState<{ ok: boolean; msg: string } | null>(null);

  // QR login state (weixin / whatsapp)
  const [qrStatus, setQrStatus] = useState<'idle' | 'starting' | 'wait' | 'scaned' | 'refreshed' | 'connected' | 'confirmed' | 'qr_ready' | 'error' | 'timeout'>('idle');
  const [qrMsg, setQrMsg] = useState('');
  const [qrImgUrl, setQrImgUrl] = useState('');
  const [qrText, setQrText] = useState('');
  const [qrPollTimer, setQrPollTimer] = useState<ReturnType<typeof setInterval> | null>(null);

  const stopQrPoll = useCallback(() => {
    if (qrPollTimer) { clearInterval(qrPollTimer); setQrPollTimer(null); }
  }, [qrPollTimer]);

  const resetWizard = useCallback(() => {
    stopQrPoll();
    setAddingChannel(null);
    setWizardStep(0);
    setWizTokens({});
    setWizDmPolicy('pairing');
    setWizAllowFrom([]);
    setWizRequireMention(false);
    setTestStatus('idle');
    setTestMsg('');
    setSaveResult(null);
    setQrStatus('idle');
    setQrMsg('');
    setQrImgUrl('');
    setQrText('');
  }, [stopQrPoll]);

  const selectChannel = useCallback((chId: string) => {
    stopQrPoll();
    setAddingChannel(chId);
    setWizTokens({});
    setWizDmPolicy('pairing');
    setWizAllowFrom([]);
    setWizRequireMention(false);
    setTestStatus('idle');
    setTestMsg('');
    setSaveResult(null);
    setQrStatus('idle');
    setQrMsg('');
    setQrImgUrl('');
    setQrText('');
    setWizardStep(1);
  }, [stopQrPoll]);

  // ── Weixin QR login ──
  const startWeixinQR = useCallback(async () => {
    setQrStatus('starting');
    setQrMsg('');
    setQrImgUrl('');
    try {
      const res = await post<{ qrImgUrl?: string; status?: string }>('/api/v1/setup/weixin-qr/start', {});
      if (res?.qrImgUrl) setQrImgUrl(res.qrImgUrl);
      setQrStatus('wait');
      setQrMsg(cw.qrReady || 'QR code ready, please scan');
      // Start polling
      const timer = setInterval(async () => {
        try {
          const poll = await post<{ status: string; message?: string; qrImgUrl?: string; accountId?: string; token?: string; baseUrl?: string }>('/api/v1/setup/weixin-qr/poll', {});
          if (!poll) return;
          if (poll.qrImgUrl) setQrImgUrl(poll.qrImgUrl);
          if (poll.message) setQrMsg(poll.message);
          if (poll.status === 'confirmed') {
            setQrStatus('confirmed');
            // Auto-fill credentials from QR login result
            setWizTokens(prev => ({
              ...prev,
              ...(poll.accountId ? { accountId: poll.accountId } : {}),
              ...(poll.token ? { token: poll.token } : {}),
              ...(poll.baseUrl ? { baseUrl: poll.baseUrl } : {}),
            }));
            clearInterval(timer);
            setQrPollTimer(null);
          } else if (poll.status === 'error' || poll.status === 'timeout') {
            setQrStatus(poll.status as any);
            clearInterval(timer);
            setQrPollTimer(null);
          } else {
            setQrStatus(poll.status as any);
          }
        } catch { /* ignore poll error */ }
      }, 2000);
      setQrPollTimer(timer);
    } catch (e: any) {
      setQrStatus('error');
      setQrMsg(e?.message || 'Failed to start QR login');
    }
  }, [cw]);

  // ── WhatsApp QR pairing ──
  const startWhatsAppPair = useCallback(async () => {
    setQrStatus('starting');
    setQrMsg('');
    try {
      await post('/api/v1/setup/whatsapp-pair/start', { mode: wizTokens.mode || 'bot' });
      setQrStatus('wait');
      setQrMsg(cw.started || 'Pairing started...');
      // Start polling
      const timer = setInterval(async () => {
        try {
          const poll = await post<{ status: string; message?: string; done?: boolean; qrText?: string }>('/api/v1/setup/whatsapp-pair/poll', {});
          if (!poll) return;
          if (poll.message) setQrMsg(poll.message);
          if (poll.qrText) setQrText(poll.qrText);
          if (poll.status === 'connected') {
            setQrStatus('connected');
            clearInterval(timer);
            setQrPollTimer(null);
          } else if (poll.status === 'error' || poll.status === 'timeout') {
            setQrStatus(poll.status as any);
            clearInterval(timer);
            setQrPollTimer(null);
          } else {
            setQrStatus(poll.status as any);
          }
        } catch { /* ignore */ }
      }, 2000);
      setQrPollTimer(timer);
    } catch (e: any) {
      setQrStatus('error');
      setQrMsg(e?.message || 'Failed to start WhatsApp pairing');
    }
  }, [cw, wizTokens.mode]);

  // Cleanup poll timer on unmount
  useEffect(() => { return () => { if (qrPollTimer) clearInterval(qrPollTimer); }; }, [qrPollTimer]);

  // Whether this channel uses QR login flow
  const isQrChannel = addingChannel === 'weixin' || addingChannel === 'whatsapp';

  const handleTest = useCallback(async () => {
    if (!addingChannel) return;
    setTestStatus('testing');
    setTestMsg('');
    try {
      const res = await post<{ status: string; message: string }>('/api/v1/setup/test-channel', {
        channel: addingChannel,
        tokens: wizTokens,
      });
      if (res?.status === 'ok') {
        setTestStatus('ok');
        setTestMsg(res.message || '');
      } else {
        setTestStatus('fail');
        setTestMsg(res?.message || 'Unknown error');
      }
    } catch (e: any) {
      setTestStatus('fail');
      setTestMsg(e?.message || 'Request failed');
    }
  }, [addingChannel, wizTokens]);

  const handleSave = useCallback(async () => {
    if (!addingChannel) return;
    setSaving(true);
    setSaveResult(null);
    try {
      const res = await post<{ message: string }>('/api/v1/config/channel-wizard', {
        channel: addingChannel,
        tokens: wizTokens,
        dmPolicy: wizDmPolicy,
        allowFrom: wizAllowFrom,
        requireMention: wizRequireMention,
      });
      setSaveResult({ ok: true, msg: res?.message || 'Saved' });
      // Refresh env vars
      await loadEnvVars();
      // Auto-restart gateway after save
      setRestarting(true);
      try { await gatewayApi.restart(); } catch { /* ignore */ }
      setRestarting(false);
    } catch (e: any) {
      setSaveResult({ ok: false, msg: e?.message || 'Save failed' });
    }
    setSaving(false);
  }, [addingChannel, wizTokens, wizDmPolicy, wizAllowFrom, wizRequireMention, loadEnvVars]);

  const chInfo = addingChannel ? CHANNEL_TYPES.find(c => c.id === addingChannel) : null;

  // Credential validation
  const getCredErrors = useCallback((): string[] => {
    if (!chInfo) return [];
    const errors: string[] = [];
    for (const f of chInfo.tokenFields) {
      if (f.required && !wizTokens[f.key]) {
        errors.push(cw[f.labelKey] || f.labelKey);
      }
    }
    return errors;
  }, [chInfo, wizTokens, cw]);

  // Step summaries for AccordionStep
  const stepSummaries = useMemo(() => [
    chInfo ? `${cw[chInfo.labelKey] || chInfo.labelKey}` : '',
    wizardStep > 1 ? (cw.prepDone || 'Done') : '',
    wizardStep > 2 ? '✓' : '',
    wizardStep > 3 ? wizDmPolicy : '',
    '',
  ], [chInfo, cw, wizardStep, wizDmPolicy]);

  // ---------- Render: Configured Channels List ----------
  const renderConfiguredChannels = () => {
    const configured = CHANNEL_TYPES.filter(c => configuredChannels.has(c.id));
    if (configured.length === 0) return null;

    return (
      <div className="space-y-2">
        <h3 className="text-xs font-bold theme-text-secondary flex items-center gap-1.5">
          <span className="material-symbols-outlined text-sm text-green-500">check_circle</span>
          {es.configuredChannels || 'Configured Channels'}
        </h3>
        <div className="space-y-2">
          {configured.map(ch => {
            const isExpanded = expandedCard === ch.id;
            const isDelConfirm = deleteConfirm === ch.id;
            const isPairing = pairingChannel === ch.id;
            return (
              <div key={ch.id} className={`rounded-xl border transition-colors ${isExpanded ? 'border-primary/40 theme-panel' : 'border-green-200 dark:border-green-500/20 bg-green-50/50 dark:bg-green-500/5'}`}>
                {/* Card header */}
                <div className="flex items-center gap-2.5 p-2.5 cursor-pointer" onClick={() => toggleCard(ch.id)}>
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${isExpanded ? 'bg-primary/10' : 'bg-green-100 dark:bg-green-500/10'}`}>
                    <span className={`material-symbols-outlined text-[16px] ${isExpanded ? 'text-primary' : 'text-green-600 dark:text-green-400'}`}>{ch.icon}</span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-[11px] font-bold text-slate-700 dark:text-white/80 truncate">
                      {cw[ch.labelKey] || ch.labelKey}
                    </div>
                    <div className="text-[10px] text-green-600 dark:text-green-400 flex items-center gap-1">
                      <span className="material-symbols-outlined text-[10px]">check</span>
                      {es.enabled || 'Enabled'}
                    </div>
                  </div>
                  {/* Toolbar buttons (stop propagation) */}
                  <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
                    {PAIRING_CHANNELS.has(ch.id) && (
                      <button title={cw.manualPairing || 'Manual Pairing'} onClick={() => { setPairingChannel(isPairing ? null : ch.id); setPairingCode(''); setPairingStatus('idle'); setPairingError(''); }}
                        className={`w-7 h-7 rounded-md flex items-center justify-center transition-colors ${isPairing ? 'bg-primary/10 text-primary' : 'hover:bg-slate-100 dark:hover:bg-white/5 theme-text-muted'}`}>
                        <span className="material-symbols-outlined text-[14px]">handshake</span>
                      </button>
                    )}
                    <button title={cw.deleteChannel || 'Delete Channel'} onClick={() => setDeleteConfirm(isDelConfirm ? null : ch.id)}
                      className={`w-7 h-7 rounded-md flex items-center justify-center transition-colors ${isDelConfirm ? 'bg-red-50 dark:bg-red-500/10 text-red-500' : 'hover:bg-slate-100 dark:hover:bg-white/5 theme-text-muted'}`}>
                      <span className="material-symbols-outlined text-[14px]">delete</span>
                    </button>
                  </div>
                  <span className={`material-symbols-outlined text-[16px] theme-text-muted transition-transform ${isExpanded ? 'rotate-180' : ''}`}>expand_more</span>
                </div>

                {/* Delete confirmation */}
                {isDelConfirm && (
                  <div className="mx-2.5 mb-2.5 px-3 py-2 rounded-lg bg-red-50 dark:bg-red-500/5 border border-red-200 dark:border-red-500/20 flex items-center gap-2">
                    <span className="material-symbols-outlined text-[14px] text-red-500">warning</span>
                    <span className="text-[11px] text-red-600 dark:text-red-400 flex-1">{cw.deleteConfirm || 'Remove this channel and all its env vars?'}</span>
                    <button onClick={() => handleDeleteChannel(ch.id)} disabled={deleting}
                      className="px-2.5 py-1 text-[10px] font-bold bg-red-500 hover:bg-red-600 text-white rounded-md transition-colors disabled:opacity-50">
                      {deleting ? '...' : (cw.confirmDelete || 'Delete')}
                    </button>
                    <button onClick={() => setDeleteConfirm(null)} className="px-2 py-1 text-[10px] font-bold theme-text-muted hover:theme-text-secondary rounded-md transition-colors">
                      {cw.cancel || 'Cancel'}
                    </button>
                  </div>
                )}

                {/* Pairing section */}
                {isPairing && (
                  <div className="mx-2.5 mb-2.5 px-3 py-2.5 rounded-lg bg-blue-50 dark:bg-blue-500/5 border border-blue-200 dark:border-blue-500/20 space-y-2">
                    <div className="flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-[14px] text-blue-500">handshake</span>
                      <span className="text-[11px] font-bold text-blue-700 dark:text-blue-400">{cw.manualPairing || 'Manual Pairing'}</span>
                    </div>
                    <div className="flex gap-2">
                      <input type="text" value={pairingCode} onChange={e => setPairingCode(e.target.value)}
                        placeholder={cw.pairingCodePlaceholder || 'Enter pairing code...'}
                        className="flex-1 h-8 px-3 text-[11px] font-mono rounded-md border border-slate-200 dark:border-white/10 bg-white dark:bg-black/20 theme-text outline-none focus:border-primary" />
                      <button onClick={() => handleApprovePairing(ch.id)} disabled={pairingStatus === 'approving' || !pairingCode.trim()}
                        className="h-8 px-3 text-[11px] font-bold bg-primary hover:bg-primary/90 text-white rounded-md transition-colors disabled:opacity-50 flex items-center gap-1">
                        <span className={`material-symbols-outlined text-[13px] ${pairingStatus === 'approving' ? 'animate-spin' : ''}`}>
                          {pairingStatus === 'approving' ? 'progress_activity' : 'check'}
                        </span>
                        {cw.approve || 'Approve'}
                      </button>
                    </div>
                    {pairingStatus === 'success' && (
                      <div className="flex items-center gap-1 text-[10px] text-green-600 dark:text-green-400">
                        <span className="material-symbols-outlined text-[12px]">check_circle</span>
                        {cw.pairingApproved || 'Pairing approved!'}
                      </div>
                    )}
                    {pairingStatus === 'error' && (
                      <div className="flex items-center gap-1 text-[10px] text-red-500">
                        <span className="material-symbols-outlined text-[12px]">error</span>
                        {pairingError}
                      </div>
                    )}
                  </div>
                )}

                {/* Expanded edit form — grouped by category like ClawDeckX */}
                {isExpanded && (
                  <div className="px-3 pb-3 pt-2 border-t border-slate-100 dark:border-white/[0.04] space-y-2">

                    {/* ── Group 1: Basic Connection (credentials + tokens) ── */}
                    <FieldGroup icon="key" title={cw.grpConnection || 'Basic Connection'} iconColor="text-amber-500" defaultOpen={true}>
                      {ch.tokenFields.filter(f => !['homeChannel', 'homeChannelName'].includes(f.key)).map(f => {
                        const label = cw[f.labelKey] || f.labelKey;
                        const val = cardTokens[f.key] || '';
                        const onChange = (v: string) => setCardTokens(prev => ({ ...prev, [f.key]: v }));
                        return f.secret ? (
                          <PasswordField key={f.key} label={label} value={val} onChange={onChange} placeholder={f.placeholder || ''} />
                        ) : (
                          <TextField key={f.key} label={label} value={val} onChange={onChange} placeholder={f.placeholder || ''} />
                        );
                      })}
                    </FieldGroup>

                    {/* ── Group 2: Access Control ── */}
                    {ch.hasAccessControl && (
                      <FieldGroup icon="shield" title={cw.grpAccess || 'Access Control'} iconColor="text-blue-500">
                        <SelectField
                          label={cw.dmPolicy || 'DM Policy'}
                          value={cardTokens.dmPolicy || 'pairing'}
                          onChange={v => setCardTokens(prev => ({ ...prev, dmPolicy: v }))}
                          options={dmPolicyOptions(cw)}
                        />
                        <TextField
                          label={cw.allowFrom || 'Allowed Users'}
                          value={cardTokens._allowFrom || ''}
                          onChange={v => setCardTokens(prev => ({ ...prev, _allowFrom: v }))}
                          placeholder="user1,user2,..."
                        />
                        {MENTION_CHANNELS.has(ch.id) && (
                          <SwitchField
                            label={cw.requireMention || 'Require @mention'}
                            value={cardTokens.requireMention === 'true'}
                            onChange={v => setCardTokens(prev => ({ ...prev, requireMention: v ? 'true' : 'false' }))}
                          />
                        )}
                      </FieldGroup>
                    )}

                    {/* ── Group 3: Home Channel ── */}
                    {HOME_CHANNEL_CHANNELS.has(ch.id) && (
                      <FieldGroup icon="home" title={cw.grpHome || 'Home Channel'} iconColor="text-green-500">
                        <TextField
                          label={cw.homeChannel || 'Home Channel ID'}
                          value={cardTokens.homeChannel || ''}
                          onChange={v => setCardTokens(prev => ({ ...prev, homeChannel: v }))}
                          placeholder={ch.id === 'telegram' ? '-100...' : ch.id === 'discord' ? '123456789...' : ''}
                        />
                        <TextField
                          label={cw.homeChannelName || 'Home Channel Name'}
                          value={cardTokens.homeChannelName || ''}
                          onChange={v => setCardTokens(prev => ({ ...prev, homeChannelName: v }))}
                          placeholder="Home"
                        />
                      </FieldGroup>
                    )}

                    {/* ── Group 4: Advanced Settings ── */}
                    {REPLY_TO_CHANNELS.has(ch.id) && (
                      <FieldGroup icon="tune" title={cw.grpAdvanced || 'Advanced Settings'} iconColor="text-purple-500">
                        <SelectField
                          label={cw.replyToMode || 'Reply To Mode'}
                          value={cardTokens.replyToMode || ''}
                          onChange={v => setCardTokens(prev => ({ ...prev, replyToMode: v }))}
                          options={replyToOptions(cw)}
                        />
                      </FieldGroup>
                    )}

                    {/* ── Action bar ── */}
                    <div className="flex items-center gap-2 pt-2 border-t border-slate-100 dark:border-white/[0.04] flex-wrap">
                      <button onClick={() => handleCardTest(ch.id)} disabled={cardTestStatus === 'testing'}
                        className="flex items-center gap-1 px-3 py-1.5 rounded-md text-[10px] font-bold border border-slate-200 dark:border-white/10 hover:bg-slate-50 dark:hover:bg-white/5 transition-all disabled:opacity-50">
                        <span className={`material-symbols-outlined text-[13px] ${cardTestStatus === 'testing' ? 'animate-spin' : ''} ${cardTestStatus === 'ok' ? 'text-green-500' : cardTestStatus === 'fail' ? 'text-red-500' : 'text-primary'}`}>
                          {cardTestStatus === 'testing' ? 'progress_activity' : cardTestStatus === 'ok' ? 'check_circle' : cardTestStatus === 'fail' ? 'error' : 'wifi_tethering'}
                        </span>
                        <span className={cardTestStatus === 'ok' ? 'text-green-600 dark:text-green-400' : cardTestStatus === 'fail' ? 'text-red-500' : ''}>
                          {cardTestStatus === 'testing' ? (cw.testing || 'Testing...') : cardTestStatus === 'ok' ? (cw.testOk || 'Connected') : cardTestStatus === 'fail' ? (cw.testFail || 'Failed') : (cw.testConn || 'Test Connection')}
                        </span>
                      </button>
                      {cardTestMsg && <span className={`text-[10px] ${cardTestStatus === 'ok' ? 'text-green-600 dark:text-green-400' : 'text-red-500'}`}>{cardTestMsg}</span>}
                      <div className="flex-1" />
                      {cardSaveResult && (
                        <span className={`text-[10px] flex items-center gap-1 ${cardSaveResult.ok ? 'text-green-600' : 'text-red-500'}`}>
                          <span className="material-symbols-outlined text-[12px]">{cardSaveResult.ok ? 'check_circle' : 'error'}</span>
                          {cardSaveResult.ok ? (cw.saved || 'Saved!') : cardSaveResult.msg}
                        </span>
                      )}
                      {restarting && (
                        <span className="text-[10px] text-amber-600 dark:text-amber-400 flex items-center gap-1">
                          <span className="material-symbols-outlined text-[12px] animate-spin">progress_activity</span>
                          {cw.restarting || 'Restarting gateway...'}
                        </span>
                      )}
                      <button onClick={() => handleCardSave(ch.id)} disabled={cardSaving || restarting}
                        className="px-3.5 py-1.5 bg-primary text-white text-[10px] font-bold rounded-md hover:bg-primary/90 transition-colors flex items-center gap-1 disabled:opacity-50">
                        <span className={`material-symbols-outlined text-[13px] ${cardSaving ? 'animate-spin' : ''}`}>{cardSaving ? 'progress_activity' : 'save'}</span>
                        {cardSaving ? (cw.saving || 'Saving...') : (cw.saveRestart || 'Save & Restart')}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-4">
      {/* Configured channels overview */}
      {!envLoading && renderConfiguredChannels()}

      {/* Discord config.yaml settings (always visible) */}
      {configuredChannels.has('discord') && (
        <ConfigSection title={es.discordConfig || 'Discord (config.yaml)'} icon="sports_esports" iconColor="text-indigo-500" defaultOpen={false}>
          <SwitchField label={es.requireMention || 'Require @mention'} desc={es.requireMentionDesc || ''} tooltip={tip('discord.require_mention')} value={getField(['discord', 'require_mention']) !== false} onChange={v => setField(['discord', 'require_mention'], v)} />
          <TextField label={es.freeResponseChannels || 'Free Response Channels'} desc={es.freeResponseChannelsDesc || ''} tooltip={tip('discord.free_response_channels')} value={getField(['discord', 'free_response_channels']) || ''} onChange={v => setField(['discord', 'free_response_channels'], v)} placeholder="" />
          <TextField label={es.allowedChannels || 'Allowed Channels'} desc={es.allowedChannelsDesc || ''} tooltip={tip('discord.allowed_channels')} value={getField(['discord', 'allowed_channels']) || ''} onChange={v => setField(['discord', 'allowed_channels'], v)} placeholder="" />
          <SwitchField label={es.autoThread || 'Auto Thread'} desc={es.autoThreadDesc || ''} tooltip={tip('discord.auto_thread')} value={getField(['discord', 'auto_thread']) !== false} onChange={v => setField(['discord', 'auto_thread'], v)} />
          <SwitchField label={es.reactions || 'Reactions'} desc={es.reactionsDesc || ''} tooltip={tip('discord.reactions')} value={getField(['discord', 'reactions']) !== false} onChange={v => setField(['discord', 'reactions'], v)} />
          <ChannelPromptsField platform="discord" getField={getField} setField={setField} tip={tip} es={es} />
        </ConfigSection>
      )}

      {/* Telegram / Slack / Mattermost channel_prompts (hermes v0.10.0+) */}
      {(['telegram', 'slack', 'mattermost'] as const).map(platform => (
        configuredChannels.has(platform) && (
          <ConfigSection
            key={`${platform}-yaml`}
            title={(es as any)[`${platform}Config`] || `${platform.charAt(0).toUpperCase() + platform.slice(1)} (config.yaml)`}
            icon={platform === 'telegram' ? 'send' : platform === 'slack' ? 'tag' : 'chat_bubble'}
            iconColor={platform === 'telegram' ? 'text-sky-500' : platform === 'slack' ? 'text-purple-500' : 'text-teal-500'}
            defaultOpen={false}
          >
            <ChannelPromptsField platform={platform} getField={getField} setField={setField} tip={tip} es={es} />
          </ConfigSection>
        )
      ))}

      {/* WhatsApp config.yaml settings */}
      {configuredChannels.has('whatsapp') && (
        <ConfigSection title={es.whatsappConfig || 'WhatsApp (config.yaml)'} icon="chat" iconColor="text-green-500" defaultOpen={false}>
          <TextField
            label={es.whatsappReplyPrefix || 'Reply Prefix'}
            desc={es.whatsappReplyPrefixHint || ''}
            value={(() => { const val = getField(['whatsapp']); if (val && typeof val === 'object' && 'reply_prefix' in val) return val.reply_prefix || ''; return ''; })()}
            onChange={v => { const current = getField(['whatsapp']) || {}; setField(['whatsapp'], { ...current, reply_prefix: v || undefined }); }}
            placeholder=""
          />
        </ConfigSection>
      )}

      {/* Global channel behavior settings (config.yaml) */}
      {!envLoading && configuredChannels.size > 0 && (
        <ConfigSection title={cw.grpGlobal || 'Global Channel Behavior'} icon="settings_suggest" iconColor="text-violet-500" defaultOpen={false}>
          <SelectField
            label={cw.unauthorizedDm || 'Unauthorized DM Behavior'}
            value={getField(['unauthorized_dm_behavior']) || 'pair'}
            onChange={v => setField(['unauthorized_dm_behavior'], v)}
            options={[
              { value: 'pair', label: cw.pairing || 'Pairing' },
              { value: 'ignore', label: cw.optIgnore || 'Ignore' },
            ]}
          />
          <SwitchField
            label={cw.sttEnabled || 'Voice Message STT'}
            desc={cw.sttEnabledDesc || 'Auto-transcribe inbound voice messages'}
            value={getField(['stt_enabled']) !== false}
            onChange={v => setField(['stt_enabled'], v)}
          />
          <SwitchField
            label={cw.groupSessionsPerUser || 'Group Session Isolation'}
            desc={cw.groupSessionsPerUserDesc || 'Isolate group sessions per participant'}
            value={getField(['group_sessions_per_user']) !== false}
            onChange={v => setField(['group_sessions_per_user'], v)}
          />
          <SwitchField
            label={cw.threadSessionsPerUser || 'Thread Session Isolation'}
            desc={cw.threadSessionsPerUserDesc || 'Isolate thread sessions per participant'}
            value={getField(['thread_sessions_per_user']) === true}
            onChange={v => setField(['thread_sessions_per_user'], v)}
          />
          <SwitchField
            label={cw.streamingEnabled || 'Streaming Output'}
            desc={cw.streamingEnabledDesc || 'Stream responses in real-time'}
            value={(() => { const s = getField(['streaming']); return s && typeof s === 'object' ? s.enabled !== false : true; })()}
            onChange={v => { const cur = getField(['streaming']) || {}; setField(['streaming'], { ...cur, enabled: v }); }}
          />
        </ConfigSection>
      )}

      {/* ================================================================ */}
      {/* Add Channel Wizard (5-Step Stepper) */}
      {/* ================================================================ */}
      {!addingChannel ? (
        <button
          onClick={() => { setAddingChannel('selecting'); setWizardStep(0); }}
          className="w-full py-3 border-2 border-dashed border-primary/30 hover:border-primary/60 rounded-xl text-xs font-bold text-primary hover:bg-primary/5 transition-all flex items-center justify-center gap-2"
        >
          <span className="material-symbols-outlined text-sm">add_circle</span>
          {es.addChannel || 'Add Channel'}
        </button>
      ) : (
        <div className="space-y-2">
          <div className="flex items-center justify-between mb-1">
            <h3 className="text-xs font-bold text-slate-700 dark:text-white/80 flex items-center gap-1.5">
              <span className="material-symbols-outlined text-sm text-primary">auto_fix_high</span>
              {es.addChannel || 'Add Channel'}
            </h3>
            <button onClick={resetWizard} className="text-[10px] text-slate-400 hover:text-slate-600 dark:hover:text-white/60">
              {es.cancel || 'Cancel'}
            </button>
          </div>

          {/* Step 1: Select Channel */}
          <AccordionStep stepNum={1} icon="forum" title={cw.stepChannel || 'Channel'} summary={stepSummaries[0]} open={wizardStep === 0} done={!!addingChannel && addingChannel !== 'selecting'} onToggle={() => setWizardStep(0)}>
            <div className="space-y-3 pt-3">
              {CATEGORY_ORDER.map(cat => {
                const items = CHANNEL_TYPES.filter(c => c.category === cat);
                if (items.length === 0) return null;
                return (
                  <div key={cat}>
                    <div className="text-[10px] font-medium text-slate-400 dark:text-white/40 mb-1.5">
                      {(cw as any)[CATEGORY_KEYS[cat]] || (es as any)[CATEGORY_KEYS[cat]] || cat}
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                      {items.map(c => (
                        <button key={c.id} onClick={() => selectChannel(c.id)}
                          className={`p-2.5 rounded-lg border-2 transition-all text-start ${addingChannel === c.id ? 'border-primary bg-primary/5 dark:bg-primary/10' : 'border-slate-200 dark:border-white/10 hover:border-primary/40'}`}>
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="material-symbols-outlined text-[16px] shrink-0">{c.icon}</span>
                            <div className="min-w-0">
                              <span className="text-[11px] font-bold text-[var(--color-text)] dark:text-white/80 truncate block">
                                {cw[c.labelKey] || c.labelKey}
                                {configuredChannels.has(c.id) && <span className="text-[9px] px-1 py-0.5 ms-1 rounded bg-green-100 dark:bg-green-500/10 text-green-600 dark:text-green-400 font-bold">✓</span>}
                              </span>
                            </div>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </AccordionStep>

          {/* Step 2: Preparation */}
          <AccordionStep stepNum={2} icon="checklist" title={cw.stepPrep || 'Preparation'} summary={stepSummaries[1]} open={wizardStep === 1} done={wizardStep > 1} onToggle={() => addingChannel && addingChannel !== 'selecting' && setWizardStep(1)}>
            {chInfo && (
              <div className="space-y-2 pt-3">
                {chInfo.helpUrl && (
                  <a href={chInfo.helpUrl} target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-2 p-2.5 rounded-lg bg-blue-50 dark:bg-blue-500/5 border border-blue-200 dark:border-blue-500/20 hover:bg-blue-100 dark:hover:bg-blue-500/10 transition-colors cursor-pointer">
                    <span className="material-symbols-outlined text-[14px] text-blue-500">open_in_new</span>
                    <span className="text-[11px] font-bold text-blue-600 dark:text-blue-400">{cw.openPlatform || 'Open Platform'}</span>
                    <span className="text-[11px] text-blue-400 dark:text-blue-500 truncate ms-auto">{chInfo.helpUrl}</span>
                  </a>
                )}

                {/* ── QR Login flow for weixin ── */}
                {addingChannel === 'weixin' && (
                  <div className="space-y-3">
                    <div className="flex items-start gap-2.5 p-3 rounded-lg bg-green-50 dark:bg-green-500/5 border border-green-200 dark:border-green-500/20">
                      <span className="material-symbols-outlined text-[16px] text-green-600 dark:text-green-400 mt-0.5">qr_code_2</span>
                      <div>
                        <p className="text-[11px] font-bold text-green-700 dark:text-green-400 mb-1">{cw.weixinLogin || 'WeChat QR Login'}</p>
                        <p className="text-[10px] text-green-600 dark:text-green-500/80">{cw.weixinLoginDesc || 'Click the button below to generate a QR code, then scan with WeChat to connect your account'}</p>
                      </div>
                    </div>
                    {qrImgUrl && (qrStatus === 'wait' || qrStatus === 'scaned' || qrStatus === 'refreshed') && (
                      <div className="flex flex-col items-center gap-2 p-4 rounded-lg bg-white dark:bg-white/[0.03] border border-slate-200 dark:border-white/10">
                        <img src={qrImgUrl} alt="WeChat QR" className="w-48 h-48 rounded-lg" />
                        <p className="text-[10px] text-slate-500 dark:text-white/50">{qrMsg}</p>
                      </div>
                    )}
                    {qrStatus === 'confirmed' && (
                      <div className="flex items-center gap-2 p-3 rounded-lg bg-green-100 dark:bg-green-500/10 border border-green-300 dark:border-green-500/30">
                        <span className="material-symbols-outlined text-[16px] text-green-600">check_circle</span>
                        <span className="text-[11px] font-bold text-green-700 dark:text-green-400">{cw.loginSuccess || 'Login successful!'}</span>
                      </div>
                    )}
                    {(qrStatus === 'error' || qrStatus === 'timeout') && (
                      <div className="flex items-center gap-2 p-3 rounded-lg bg-red-50 dark:bg-red-500/5 border border-red-200 dark:border-red-500/20">
                        <span className="material-symbols-outlined text-[14px] text-red-500">error</span>
                        <span className="text-[11px] text-red-600 dark:text-red-400">{qrMsg || (cw.loginFailed || 'Login failed')}</span>
                      </div>
                    )}
                    {qrStatus !== 'confirmed' && (
                      <button onClick={startWeixinQR} disabled={qrStatus === 'starting' || qrStatus === 'wait' || qrStatus === 'scaned'}
                        className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-[11px] font-bold bg-green-500 hover:bg-green-600 text-white transition-colors disabled:opacity-50">
                        <span className={`material-symbols-outlined text-[14px] ${qrStatus === 'starting' || qrStatus === 'wait' || qrStatus === 'scaned' ? 'animate-spin' : ''}`}>
                          {qrStatus === 'starting' || qrStatus === 'wait' || qrStatus === 'scaned' ? 'progress_activity' : 'qr_code_2'}
                        </span>
                        {qrStatus === 'starting' ? (cw.generating || 'Generating...') : qrStatus === 'wait' ? (cw.qrReady || 'Waiting for scan...') : qrStatus === 'scaned' ? (cw.qrReady || 'Confirming...') : (cw.generateQR || 'Generate QR Code')}
                      </button>
                    )}
                  </div>
                )}

                {/* ── QR Pairing flow for whatsapp ── */}
                {addingChannel === 'whatsapp' && (
                  <div className="space-y-3">
                    <div className="flex items-start gap-2.5 p-3 rounded-lg bg-green-50 dark:bg-green-500/5 border border-green-200 dark:border-green-500/20">
                      <span className="material-symbols-outlined text-[16px] text-green-600 dark:text-green-400 mt-0.5">smartphone</span>
                      <div>
                        <p className="text-[11px] font-bold text-green-700 dark:text-green-400 mb-1">{cw.whatsappLogin || 'WhatsApp Web Login'}</p>
                        <p className="text-[10px] text-green-600 dark:text-green-500/80">{cw.whatsappLoginDesc || 'Click the button below to start pairing, then scan the QR code with WhatsApp on your phone'}</p>
                      </div>
                    </div>
                    {/* Mode selector */}
                    <div>
                      <label className="text-[10px] font-bold theme-text-secondary mb-1.5 block">{cw.whatsappMode || 'WhatsApp Mode'}</label>
                      <div className="grid grid-cols-2 gap-1.5">
                        {[
                          { value: 'bot', icon: 'smart_toy', label: 'Bot (separate number)', desc: 'Dedicated bot phone number' },
                          { value: 'self-chat', icon: 'person', label: 'Self-chat (personal)', desc: 'Message yourself to talk to agent' },
                        ].map(opt => (
                          <button key={opt.value} onClick={() => setWizTokens(prev => ({ ...prev, mode: opt.value }))}
                            className={`p-2.5 rounded-lg border-2 text-start transition-all ${(wizTokens.mode || 'bot') === opt.value ? 'border-primary bg-primary/5 dark:bg-primary/10' : 'border-slate-200 dark:border-white/10 hover:border-primary/40'}`}>
                            <div className="flex items-center gap-1.5 mb-0.5">
                              <span className={`material-symbols-outlined text-[14px] ${(wizTokens.mode || 'bot') === opt.value ? 'text-primary' : 'text-slate-400'}`}>{opt.icon}</span>
                              <span className="text-[11px] font-bold text-[var(--color-text)] dark:text-white/80">{opt.label}</span>
                            </div>
                            <div className="text-[10px] text-slate-400 dark:text-white/35">{opt.desc}</div>
                          </button>
                        ))}
                      </div>
                    </div>
                    {qrStatus === 'connected' && (
                      <div className="flex items-center gap-2 p-3 rounded-lg bg-green-100 dark:bg-green-500/10 border border-green-300 dark:border-green-500/30">
                        <span className="material-symbols-outlined text-[16px] text-green-600">check_circle</span>
                        <span className="text-[11px] font-bold text-green-700 dark:text-green-400">{cw.loginSuccess || 'WhatsApp paired successfully!'}</span>
                      </div>
                    )}
                    {(qrStatus === 'error' || qrStatus === 'timeout') && (
                      <div className="flex items-center gap-2 p-3 rounded-lg bg-red-50 dark:bg-red-500/5 border border-red-200 dark:border-red-500/20">
                        <span className="material-symbols-outlined text-[14px] text-red-500">error</span>
                        <span className="text-[11px] text-red-600 dark:text-red-400">{qrMsg || (cw.loginFailed || 'Pairing failed')}</span>
                      </div>
                    )}
                    {(qrStatus === 'wait' || qrStatus === 'qr_ready') && (
                      qrText ? (
                        <div className="flex flex-col items-center gap-2 p-4 rounded-lg bg-white dark:bg-white/[0.03] border border-slate-200 dark:border-white/10">
                          <pre className="font-mono text-[6px] leading-[7px] text-black dark:text-white whitespace-pre select-none">{qrText}</pre>
                          <p className="text-[10px] text-slate-500 dark:text-white/50">{qrMsg}</p>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 p-3 rounded-lg bg-amber-50 dark:bg-amber-500/5 border border-amber-200 dark:border-amber-500/20">
                          <span className="material-symbols-outlined text-[14px] text-amber-600 animate-spin">progress_activity</span>
                          <span className="text-[11px] text-amber-700 dark:text-amber-400">{qrMsg || 'Waiting for QR code...'}</span>
                        </div>
                      )
                    )}
                    {qrStatus !== 'connected' && (
                      <button onClick={startWhatsAppPair} disabled={qrStatus === 'starting' || qrStatus === 'wait' || qrStatus === 'qr_ready'}
                        className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-[11px] font-bold bg-green-500 hover:bg-green-600 text-white transition-colors disabled:opacity-50">
                        <span className={`material-symbols-outlined text-[14px] ${qrStatus === 'starting' || qrStatus === 'wait' || qrStatus === 'qr_ready' ? 'animate-spin' : ''}`}>
                          {qrStatus === 'starting' || qrStatus === 'wait' || qrStatus === 'qr_ready' ? 'progress_activity' : 'phonelink'}
                        </span>
                        {qrStatus === 'starting' ? (cw.generating || 'Starting...') : qrStatus === 'wait' || qrStatus === 'qr_ready' ? (cw.qrReady || 'Pairing in progress...') : (cw.generateQR || 'Start QR Pairing')}
                      </button>
                    )}
                  </div>
                )}

                {/* ── Standard prep steps for other channels ── */}
                {!isQrChannel && (() => {
                  // Dynamic access pattern matching ClawDeckX: xxxPrep / xxxPitfall.
                  // The scan-dynamic-usage.mjs script detects these patterns so
                  // they are protected against blanket i18n cleanup tools.
                  const prepSteps: string[] = (addingChannel && (cw as any)[`${addingChannel}Prep`]) || [];
                  const pitfall: string = (addingChannel && (cw as any)[`${addingChannel}Pitfall`]) || '';
                  return (
                    <>
                      {prepSteps.length > 0 ? prepSteps.map((s: string, i: number) => (
                        <div key={i} className="flex items-start gap-2.5 p-2.5 rounded-lg bg-slate-50 dark:bg-white/[0.03] border border-slate-200/60 dark:border-white/[0.04]">
                          <span className="flex-shrink-0 w-5 h-5 rounded-full bg-primary/10 text-primary text-[10px] font-bold flex items-center justify-center mt-0.5">{i + 1}</span>
                          <p className="text-[11px] text-slate-700 dark:text-white/70 leading-relaxed">{s}</p>
                        </div>
                      )) : (
                        <p className="text-[11px] text-slate-400 dark:text-white/40 py-2">{cw.noPrepNeeded || 'No preparation needed, proceed to next step'}</p>
                      )}
                      {/* Feishu permission JSON quick-copy */}
                      {addingChannel === 'feishu' && cw.feishuPermJson && (
                        <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-white/[0.03] border border-slate-200/60 dark:border-white/[0.04]">
                          <div className="flex items-center justify-between mb-1.5">
                            <span className="text-[10px] font-bold text-slate-600 dark:text-white/50">{cw.copyPermJson || 'Copy Permission JSON'}</span>
                            <button onClick={() => {
                              copyToClipboard(cw.feishuPermJson).then(() => {
                                toast('success', cw.copied || 'Copied!');
                              }).catch(() => {});
                            }}
                              className="flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold text-primary hover:bg-primary/10 transition-colors">
                              <span className="material-symbols-outlined text-[12px]">content_copy</span>
                              {cw.copyPermJson || 'Copy Permission JSON'}
                            </button>
                          </div>
                          <pre className="text-[11px] text-slate-500 dark:text-white/40 bg-slate-100 dark:bg-black/20 p-2 rounded overflow-x-auto max-h-20 overflow-y-auto custom-scrollbar neon-scrollbar font-mono leading-relaxed select-text">{cw.feishuPermJson}</pre>
                        </div>
                      )}
                      {pitfall && (
                        <div className="flex items-start gap-2 p-2.5 rounded-lg bg-amber-50 dark:bg-amber-500/5 border border-amber-200 dark:border-amber-500/20">
                          <span className="material-symbols-outlined text-[14px] text-amber-500 mt-0.5">warning</span>
                          <p className="text-[10px] text-amber-700 dark:text-amber-400 leading-relaxed">{pitfall}</p>
                        </div>
                      )}
                    </>
                  );
                })()}

                <div className="flex justify-end">
                  <button onClick={() => setWizardStep(2)}
                    disabled={isQrChannel && addingChannel === 'weixin' && qrStatus !== 'confirmed' && qrStatus !== 'idle' && qrStatus !== 'error' && qrStatus !== 'timeout'}
                    className="px-4 py-1.5 bg-primary text-white text-[11px] font-bold rounded-lg hover:bg-primary/90 transition-colors flex items-center gap-1 disabled:opacity-50">
                    {cw.next || 'Next'}<span className="material-symbols-outlined text-[14px]">chevron_right</span>
                  </button>
                </div>
              </div>
            )}
          </AccordionStep>

          {/* Step 3: Credentials */}
          <AccordionStep stepNum={3} icon="key" title={cw.stepCredential || 'Credentials'} summary={stepSummaries[2]} open={wizardStep === 2} done={wizardStep > 2} onToggle={() => addingChannel && addingChannel !== 'selecting' && setWizardStep(2)}>
            {chInfo && (
              <div className="pt-3 space-y-2">
                {chInfo.tokenFields.map(f => {
                  const label = cw[f.labelKey] || f.labelKey;
                  const val = wizTokens[f.key] || '';
                  const onChange = (v: string) => setWizTokens(prev => ({ ...prev, [f.key]: v }));
                  return f.secret ? (
                    <PasswordField key={f.key} label={label} value={val} onChange={onChange} placeholder={f.placeholder || cw.tokenPlaceholder || ''} />
                  ) : (
                    <TextField key={f.key} label={label} value={val} onChange={onChange} placeholder={f.placeholder || ''} />
                  );
                })}
                {/* Test connection */}
                <div className="mt-3 pt-3 border-t border-slate-100 dark:border-white/[0.04]">
                  <div className="flex items-center gap-2 flex-wrap">
                    <button onClick={handleTest} disabled={testStatus === 'testing'}
                      className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-[11px] font-bold border border-slate-200 dark:border-white/10 hover:bg-slate-50 dark:hover:bg-white/5 transition-all disabled:opacity-50">
                      <span className={`material-symbols-outlined text-[14px] ${testStatus === 'testing' ? 'animate-spin' : ''} ${testStatus === 'ok' ? 'text-green-500' : testStatus === 'fail' ? 'text-red-500' : 'text-primary'}`}>
                        {testStatus === 'testing' ? 'progress_activity' : testStatus === 'ok' ? 'check_circle' : testStatus === 'fail' ? 'error' : 'wifi_tethering'}
                      </span>
                      <span className={testStatus === 'ok' ? 'text-green-600 dark:text-green-400' : testStatus === 'fail' ? 'text-red-500' : 'text-slate-700 dark:text-white/80'}>
                        {testStatus === 'testing' ? (cw.testing || 'Testing...') : testStatus === 'ok' ? (cw.testOk || 'Connected') : testStatus === 'fail' ? (cw.testFail || 'Failed') : (cw.testConn || 'Test Connection')}
                      </span>
                    </button>
                    {testStatus === 'ok' && testMsg && <span className="text-[10px] text-green-600 dark:text-green-400">{testMsg}</span>}
                    {testStatus === 'fail' && testMsg && <span className="text-[10px] text-red-500">{testMsg}</span>}
                  </div>
                </div>
                {/* Credential errors */}
                {(() => {
                  const errs = getCredErrors();
                  return errs.length > 0 ? (
                    <div className="mt-3 px-3 py-2.5 rounded-xl bg-red-50 dark:bg-red-500/5 border border-red-200 dark:border-red-500/20 flex items-start gap-2">
                      <span className="material-symbols-outlined text-[14px] text-red-500 mt-0.5 shrink-0">error</span>
                      <div className="text-[10px] text-red-600 dark:text-red-400">
                        <span className="font-bold">{es.wizCredentialRequired || 'Required fields missing'}:</span>{' '}{errs.join(', ')}
                      </div>
                    </div>
                  ) : null;
                })()}
                <div className="flex justify-end mt-3">
                  <button
                    onClick={() => { if (getCredErrors().length === 0) setWizardStep(chInfo.hasAccessControl ? 3 : 4); }}
                    disabled={getCredErrors().length > 0}
                    className="px-4 py-1.5 bg-primary text-white text-[11px] font-bold rounded-lg hover:bg-primary/90 transition-colors flex items-center gap-1 disabled:opacity-50">
                    {cw.next || 'Next'}<span className="material-symbols-outlined text-[14px]">chevron_right</span>
                  </button>
                </div>
              </div>
            )}
          </AccordionStep>

          {/* Step 4: Access Control */}
          {chInfo?.hasAccessControl && (
            <AccordionStep stepNum={4} icon="shield" title={cw.stepAccess || 'Access Control'} summary={stepSummaries[3]} open={wizardStep === 3} done={wizardStep > 3} onToggle={() => wizardStep >= 2 && setWizardStep(3)}>
              <div className="pt-3 space-y-3">
                <div>
                  <label className="text-[10px] font-bold theme-text-secondary mb-1 block">{cw.dmPolicy || 'DM Policy'}</label>
                  <div className="grid grid-cols-2 gap-1.5">
                    {([
                      { value: 'pairing', icon: 'handshake', label: cw.pairing || 'Pairing', desc: cw.pairingDesc || '' },
                      { value: 'allowlist', icon: 'checklist', label: cw.allowlist || 'Allowlist', desc: cw.allowlistDesc || '' },
                      { value: 'open', icon: 'lock_open', label: cw.open || 'Open', desc: cw.openDesc || '' },
                      { value: 'closed', icon: 'block', label: cw.disabled || 'Disabled', desc: cw.disabledDesc || '' },
                    ] as const).map(opt => (
                      <button key={opt.value} onClick={() => setWizDmPolicy(opt.value)}
                        className={`p-2.5 rounded-lg border-2 text-start transition-all ${wizDmPolicy === opt.value ? 'border-primary bg-primary/5 dark:bg-primary/10' : 'border-slate-200 dark:border-white/10 hover:border-primary/40'}`}>
                        <div className="flex items-center gap-1.5 mb-0.5">
                          <span className={`material-symbols-outlined text-[14px] ${wizDmPolicy === opt.value ? 'text-primary' : 'text-slate-400'}`}>{opt.icon}</span>
                          <span className="text-[11px] font-bold text-[var(--color-text)] dark:text-white/80">{opt.label}</span>
                        </div>
                        {opt.desc && <div className="text-[10px] text-slate-400 dark:text-white/35 leading-relaxed">{opt.desc}</div>}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="text-[10px] font-bold theme-text-secondary mb-1.5 block">{cw.allowFrom || 'Allow From'}</label>
                  <ArrayField label="" value={wizAllowFrom} onChange={setWizAllowFrom} placeholder="user ID / phone..." />
                </div>
                {(addingChannel === 'discord' || addingChannel === 'telegram' || addingChannel === 'slack') && (
                  <SwitchField label={cw.requireMention || 'Require @mention'} value={wizRequireMention} onChange={setWizRequireMention} />
                )}
                <div className="flex justify-end">
                  <button onClick={() => setWizardStep(4)}
                    className="px-4 py-1.5 bg-primary text-white text-[11px] font-bold rounded-lg hover:bg-primary/90 transition-colors flex items-center gap-1">
                    {cw.next || 'Next'}<span className="material-symbols-outlined text-[14px]">chevron_right</span>
                  </button>
                </div>
              </div>
            </AccordionStep>
          )}

          {/* Step 5: Confirm & Save */}
          <AccordionStep stepNum={chInfo?.hasAccessControl ? 5 : 4} icon="check_circle" title={cw.stepConfirm || 'Confirm'} open={wizardStep === 4} done={false} onToggle={() => wizardStep >= 3 && setWizardStep(4)}>
            {chInfo && (
              <div className="pt-3 space-y-3">
                <div className="p-3 rounded-lg bg-slate-50 dark:bg-white/[0.02] border border-slate-200 dark:border-white/[0.06] space-y-1.5">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="material-symbols-outlined text-[16px] text-primary">{chInfo.icon}</span>
                    <span className="text-xs font-bold text-[var(--color-text)]">{cw[chInfo.labelKey] || chInfo.labelKey}</span>
                  </div>
                  {chInfo.tokenFields.filter(f => wizTokens[f.key]).map(f => (
                    <div key={f.key} className="flex items-center gap-2 text-[10px]">
                      <span className="font-bold text-slate-500 dark:text-white/50 w-24 shrink-0">{cw[f.labelKey] || f.labelKey}</span>
                      <span className="font-mono text-slate-700 dark:text-white/70 truncate">{f.secret && wizTokens[f.key].length > 8 ? wizTokens[f.key].slice(0, 4) + '...' + wizTokens[f.key].slice(-4) : (f.secret ? '***' : wizTokens[f.key])}</span>
                    </div>
                  ))}
                  {chInfo.hasAccessControl && (
                    <>
                      <div className="flex items-center gap-2 text-[10px]">
                        <span className="font-bold text-slate-500 dark:text-white/50 w-24 shrink-0">{cw.dmPolicy || 'DM Policy'}</span>
                        <span className="text-slate-700 dark:text-white/70">{wizDmPolicy}</span>
                      </div>
                      {wizAllowFrom.length > 0 && (
                        <div className="flex items-center gap-2 text-[10px]">
                          <span className="font-bold text-slate-500 dark:text-white/50 w-24 shrink-0">{cw.allowFrom || 'Allow From'}</span>
                          <span className="text-slate-700 dark:text-white/70 truncate">{wizAllowFrom.join(', ')}</span>
                        </div>
                      )}
                    </>
                  )}
                </div>
                <p className="text-[10px] theme-text-muted">
                  {cw.configSummary || 'The above configuration will be written to ~/.hermes/.env'}
                </p>
                {/* Save result */}
                {saveResult && (
                  <div className={`px-3 py-2 rounded-lg text-[11px] flex items-center gap-1.5 ${saveResult.ok ? 'bg-green-100 dark:bg-green-500/10 text-green-600' : 'bg-red-100 dark:bg-red-500/10 text-red-500'}`}>
                    <span className="material-symbols-outlined text-[14px]">{saveResult.ok ? 'check_circle' : 'error'}</span>
                    {saveResult.ok ? (cw.saved || 'Config Saved!') : saveResult.msg}
                  </div>
                )}
                {restarting && (
                  <div className="px-3 py-2 rounded-lg text-[11px] flex items-center gap-1.5 bg-amber-50 dark:bg-amber-500/5 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-500/20">
                    <span className="material-symbols-outlined text-[14px] animate-spin">progress_activity</span>
                    {cw.restarting || 'Restarting gateway...'}
                  </div>
                )}
                <div className="flex justify-end">
                  {saveResult?.ok && !restarting ? (
                    <button onClick={resetWizard}
                      className="px-4 py-1.5 bg-green-500 hover:bg-green-600 text-white text-[11px] font-bold rounded-lg transition-colors flex items-center gap-1">
                      <span className="material-symbols-outlined text-[14px]">check</span> {cw.finish || 'Finish'}
                    </button>
                  ) : (
                    <button onClick={handleSave} disabled={saving || restarting}
                      className="px-4 py-1.5 bg-primary text-white text-[11px] font-bold rounded-lg hover:bg-primary/90 transition-colors flex items-center gap-1 disabled:opacity-50">
                      <span className={`material-symbols-outlined text-[14px] ${saving ? 'animate-spin' : ''}`}>{saving ? 'progress_activity' : 'save'}</span>
                      {saving ? (cw.saving || 'Saving...') : (cw.saveRestart || 'Save & Restart')}
                    </button>
                  )}
                </div>
              </div>
            )}
          </AccordionStep>
        </div>
      )}
    </div>
  );
};
