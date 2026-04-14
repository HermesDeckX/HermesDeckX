import React, { useMemo } from 'react';
import { SectionProps } from '../sectionTypes';
import { ConfigSection, TextField, NumberField, SelectField, SwitchField, ArrayField, KeyValueField } from '../fields';
import { getTranslation } from '../../../locales';
import { schemaTooltip } from '../schemaTooltip';

// ============================================================================
// hermes-agent Tools & Terminal Section
// ============================================================================
// hermes-agent config.yaml paths used here:
//   toolsets                       — list of enabled toolset names
//   terminal.*                     — terminal backend configuration
//   browser.*                      — browser tool settings
//   checkpoints.*                  — filesystem checkpoint settings
//   file_read_max_chars            — max chars per read_file call
//   security.*                     — pre-exec security scanning (tirith)
//   compression.*                  — context compression settings
//   smart_model_routing.*          — cheap model routing for simple queries

export const ToolsSection: React.FC<SectionProps> = ({ config, schema, setField, getField, language }) => {
  const es = useMemo(() => (getTranslation(language) as any).es || {}, [language]);
  const tip = (key: string) => schemaTooltip(key, language, schema);

  const terminalBackendOptions = useMemo(() => [
    { value: 'local', label: es.termLocal || 'Local' },
    { value: 'docker', label: es.termDocker || 'Docker' },
    { value: 'ssh', label: es.termSsh || 'SSH' },
    { value: 'modal', label: es.termModal || 'Modal' },
    { value: 'daytona', label: es.termDaytona || 'Daytona' },
    { value: 'singularity', label: es.termSingularity || 'Singularity' },
  ], [es]);

  const modalModeOptions = useMemo(() => [
    { value: 'auto', label: es.optAuto || 'Auto' },
    { value: 'on', label: es.optOn || 'On' },
    { value: 'off', label: es.optOff || 'Off' },
  ], [es]);

  return (
    <div className="space-y-4">
      {/* Toolsets */}
      <ConfigSection title={es.toolsets || 'Toolsets'} icon="dashboard_customize" iconColor="text-orange-500">
        <ArrayField
          label={es.enabledToolsets || 'Enabled Toolsets'}
          desc={es.enabledToolsetsDesc || 'List of toolset names to enable (e.g. "hermes-cli", "web", "mcp").'}
          tooltip={tip('toolsets')}
          value={getField(['toolsets']) || []}
          onChange={v => setField(['toolsets'], v)}
          placeholder="hermes-cli"
          suggestions={['hermes-cli', 'web', 'mcp', 'browser', 'code-execution', 'media', 'delegate']}
        />
      </ConfigSection>

      {/* Terminal */}
      <ConfigSection title={es.terminal || 'Terminal'} icon="terminal" iconColor="text-red-500">
        <SelectField
          label={es.termBackend || 'Backend'}
          desc={es.termBackendDesc || 'Terminal execution backend.'}
          tooltip={tip('terminal.backend')}
          value={getField(['terminal', 'backend']) || 'local'}
          onChange={v => setField(['terminal', 'backend'], v)}
          options={terminalBackendOptions}
        />
        <SelectField
          label={es.modalMode || 'Modal Mode'}
          desc={es.modalModeDesc || 'Modal sandbox mode: auto, on, or off.'}
          tooltip={tip('terminal.modal_mode')}
          value={getField(['terminal', 'modal_mode']) || 'auto'}
          onChange={v => setField(['terminal', 'modal_mode'], v)}
          options={modalModeOptions}
        />
        <TextField
          label={es.termCwd || 'Working Directory'}
          desc={es.termCwdDesc || 'Default working directory for terminal commands.'}
          tooltip={tip('terminal.cwd')}
          value={getField(['terminal', 'cwd']) || ''}
          onChange={v => setField(['terminal', 'cwd'], v)}
          placeholder="."
        />
        <NumberField
          label={es.termTimeout || 'Timeout (s)'}
          desc={es.termTimeoutDesc || 'Default command timeout in seconds.'}
          tooltip={tip('terminal.timeout')}
          value={getField(['terminal', 'timeout'])}
          onChange={v => setField(['terminal', 'timeout'], v)}
          min={0}
        />
        <SwitchField
          label={es.persistentShell || 'Persistent Shell'}
          desc={es.persistentShellDesc || 'Keep a long-lived shell across commands (cwd/env survives between calls).'}
          tooltip={tip('terminal.persistent_shell')}
          value={getField(['terminal', 'persistent_shell']) !== false}
          onChange={v => setField(['terminal', 'persistent_shell'], v)}
        />
        <ArrayField
          label={es.envPassthrough || 'Env Passthrough'}
          desc={es.envPassthroughDesc || 'Environment variables to pass through to sandboxed execution.'}
          tooltip={tip('terminal.env_passthrough')}
          value={getField(['terminal', 'env_passthrough']) || []}
          onChange={v => setField(['terminal', 'env_passthrough'], v)}
          placeholder="MY_VAR"
        />
      </ConfigSection>

      {/* Docker Settings (shown when backend is docker) */}
      <ConfigSection title={es.dockerSettings || 'Docker / Container'} icon="deployed_code" iconColor="text-blue-500" defaultOpen={false}>
        <TextField
          label={es.dockerImage || 'Docker Image'}
          tooltip={tip('terminal.docker_image')}
          value={getField(['terminal', 'docker_image']) || ''}
          onChange={v => setField(['terminal', 'docker_image'], v)}
          placeholder="nikolaik/python-nodejs:python3.11-nodejs20"
        />
        <ArrayField
          label={es.dockerForwardEnv || 'Forward Env Vars'}
          desc={es.dockerForwardEnvDesc || 'Host env vars to forward into the container.'}
          tooltip={tip('terminal.docker_forward_env')}
          value={getField(['terminal', 'docker_forward_env']) || []}
          onChange={v => setField(['terminal', 'docker_forward_env'], v)}
          placeholder="AWS_ACCESS_KEY_ID"
        />
        <KeyValueField
          label={es.dockerEnv || 'Docker Env (explicit)'}
          desc={es.dockerEnvDesc || 'Explicit key-value env vars for Docker containers.'}
          tooltip={tip('terminal.docker_env')}
          value={getField(['terminal', 'docker_env']) || {}}
          onChange={v => setField(['terminal', 'docker_env'], v)}
        />
        <ArrayField
          label={es.dockerVolumes || 'Docker Volumes'}
          desc={es.dockerVolumesDesc || 'Volume mounts in host_path:container_path format.'}
          tooltip={tip('terminal.docker_volumes')}
          value={getField(['terminal', 'docker_volumes']) || []}
          onChange={v => setField(['terminal', 'docker_volumes'], v)}
          placeholder="/home/user/projects:/workspace/projects"
        />
        <SwitchField
          label={es.dockerMountCwd || 'Mount CWD to /workspace'}
          desc={es.dockerMountCwdDesc || 'Mount host cwd into /workspace (weakens isolation).'}
          tooltip={tip('terminal.docker_mount_cwd_to_workspace')}
          value={getField(['terminal', 'docker_mount_cwd_to_workspace']) === true}
          onChange={v => setField(['terminal', 'docker_mount_cwd_to_workspace'], v)}
        />
        <NumberField
          label={es.containerCpu || 'Container CPU'}
          tooltip={tip('terminal.container_cpu')}
          value={getField(['terminal', 'container_cpu'])}
          onChange={v => setField(['terminal', 'container_cpu'], v)}
          min={1}
        />
        <NumberField
          label={es.containerMemory || 'Container Memory (MB)'}
          tooltip={tip('terminal.container_memory')}
          value={getField(['terminal', 'container_memory'])}
          onChange={v => setField(['terminal', 'container_memory'], v)}
          min={256}
        />
        <NumberField
          label={es.containerDisk || 'Container Disk (MB)'}
          tooltip={tip('terminal.container_disk')}
          value={getField(['terminal', 'container_disk'])}
          onChange={v => setField(['terminal', 'container_disk'], v)}
          min={1024}
        />
        <SwitchField
          label={es.containerPersistent || 'Persistent Filesystem'}
          desc={es.containerPersistentDesc || 'Persist container filesystem across sessions.'}
          tooltip={tip('terminal.container_persistent')}
          value={getField(['terminal', 'container_persistent']) !== false}
          onChange={v => setField(['terminal', 'container_persistent'], v)}
        />
      </ConfigSection>

      {/* Browser */}
      <ConfigSection title={es.browser || 'Browser'} icon="language" iconColor="text-green-500" defaultOpen={false}>
        <NumberField
          label={es.browserInactivityTimeout || 'Inactivity Timeout (s)'}
          tooltip={tip('browser.inactivity_timeout')}
          value={getField(['browser', 'inactivity_timeout'])}
          onChange={v => setField(['browser', 'inactivity_timeout'], v)}
          min={0}
        />
        <NumberField
          label={es.browserCommandTimeout || 'Command Timeout (s)'}
          tooltip={tip('browser.command_timeout')}
          value={getField(['browser', 'command_timeout'])}
          onChange={v => setField(['browser', 'command_timeout'], v)}
          min={0}
        />
        <SwitchField
          label={es.recordSessions || 'Record Sessions'}
          desc={es.recordSessionsDesc || 'Auto-record browser sessions as WebM videos.'}
          tooltip={tip('browser.record_sessions')}
          value={getField(['browser', 'record_sessions']) === true}
          onChange={v => setField(['browser', 'record_sessions'], v)}
        />
        <SwitchField
          label={es.allowPrivateUrls || 'Allow Private URLs'}
          desc={es.allowPrivateUrlsDesc || 'Allow navigating to localhost, 192.168.x.x, etc.'}
          tooltip={tip('browser.allow_private_urls')}
          value={getField(['browser', 'allow_private_urls']) === true}
          onChange={v => setField(['browser', 'allow_private_urls'], v)}
        />
        <SwitchField
          label={es.camofoxPersistence || 'Camofox Managed Persistence'}
          desc={es.camofoxPersistenceDesc || 'Use stable profile-scoped userId for persistent browser profiles.'}
          tooltip={tip('browser.camofox.managed_persistence')}
          value={getField(['browser', 'camofox', 'managed_persistence']) === true}
          onChange={v => setField(['browser', 'camofox', 'managed_persistence'], v)}
        />
      </ConfigSection>

      {/* Checkpoints */}
      <ConfigSection title={es.checkpoints || 'Checkpoints'} icon="restore" iconColor="text-purple-500" defaultOpen={false}>
        <SwitchField
          label={es.checkpointsEnabled || 'Enable Checkpoints'}
          desc={es.checkpointsEnabledDesc || 'Automatic snapshots before destructive file operations. Use /rollback to restore.'}
          tooltip={tip('checkpoints.enabled')}
          value={getField(['checkpoints', 'enabled']) !== false}
          onChange={v => setField(['checkpoints', 'enabled'], v)}
        />
        <NumberField
          label={es.maxSnapshots || 'Max Snapshots'}
          desc={es.maxSnapshotsDesc || 'Maximum checkpoints to keep per directory.'}
          tooltip={tip('checkpoints.max_snapshots')}
          value={getField(['checkpoints', 'max_snapshots'])}
          onChange={v => setField(['checkpoints', 'max_snapshots'], v)}
          min={1}
        />
      </ConfigSection>

      {/* File Read Limit */}
      <ConfigSection title={es.fileReadLimit || 'File Read Limit'} icon="description" iconColor="text-amber-500" defaultOpen={false}>
        <NumberField
          label={es.fileReadMaxChars || 'Max Chars per Read'}
          desc={es.fileReadMaxCharsDesc || 'Maximum characters returned by a single read_file call. 100K chars ~ 25-35K tokens.'}
          tooltip={tip('file_read_max_chars')}
          value={getField(['file_read_max_chars'])}
          onChange={v => setField(['file_read_max_chars'], v)}
          min={1000}
        />
      </ConfigSection>

      {/* Security */}
      <ConfigSection title={es.security || 'Security'} icon="security" iconColor="text-red-400" defaultOpen={false}>
        <SwitchField
          label={es.redactSecrets || 'Redact Secrets'}
          desc={es.redactSecretsDesc || 'Scrub secrets from tool outputs before sending to LLM.'}
          tooltip={tip('security.redact_secrets')}
          value={getField(['security', 'redact_secrets']) !== false}
          onChange={v => setField(['security', 'redact_secrets'], v)}
        />
        <SwitchField
          label={es.tirithEnabled || 'Tirith Scanning'}
          desc={es.tirithEnabledDesc || 'Pre-exec security scanning via tirith.'}
          tooltip={tip('security.tirith_enabled')}
          value={getField(['security', 'tirith_enabled']) !== false}
          onChange={v => setField(['security', 'tirith_enabled'], v)}
        />
        <TextField
          label={es.tirithPath || 'Tirith Path'}
          tooltip={tip('security.tirith_path')}
          value={getField(['security', 'tirith_path']) || ''}
          onChange={v => setField(['security', 'tirith_path'], v)}
          placeholder="tirith"
        />
        <NumberField
          label={es.tirithTimeout || 'Tirith Timeout (s)'}
          tooltip={tip('security.tirith_timeout')}
          value={getField(['security', 'tirith_timeout'])}
          onChange={v => setField(['security', 'tirith_timeout'], v)}
          min={1}
        />
        <SwitchField
          label={es.tirithFailOpen || 'Fail Open'}
          desc={es.tirithFailOpenDesc || 'Allow command if tirith scan fails/times out.'}
          tooltip={tip('security.tirith_fail_open')}
          value={getField(['security', 'tirith_fail_open']) !== false}
          onChange={v => setField(['security', 'tirith_fail_open'], v)}
        />
        <SwitchField
          label={es.websiteBlocklist || 'Website Blocklist'}
          desc={es.websiteBlocklistDesc || 'Block access to specific domains.'}
          tooltip={tip('security.website_blocklist.enabled')}
          value={getField(['security', 'website_blocklist', 'enabled']) === true}
          onChange={v => setField(['security', 'website_blocklist', 'enabled'], v)}
        />
        {getField(['security', 'website_blocklist', 'enabled']) && (
          <>
            <ArrayField
              label={es.blockedDomains || 'Blocked Domains'}
              tooltip={tip('security.website_blocklist.domains')}
              value={getField(['security', 'website_blocklist', 'domains']) || []}
              onChange={v => setField(['security', 'website_blocklist', 'domains'], v)}
              placeholder="example.com"
            />
            <ArrayField
              label={es.sharedFiles || 'Shared Blocklist Files'}
              tooltip={tip('security.website_blocklist.shared_files')}
              value={getField(['security', 'website_blocklist', 'shared_files']) || []}
              onChange={v => setField(['security', 'website_blocklist', 'shared_files'], v)}
              placeholder="/path/to/blocklist.txt"
            />
          </>
        )}
      </ConfigSection>

      {/* Compression */}
      <ConfigSection title={es.compression || 'Context Compression'} icon="compress" iconColor="text-cyan-500" defaultOpen={false}>
        <SwitchField
          label={es.compressionEnabled || 'Enable Compression'}
          desc={es.compressionEnabledDesc || 'Auto-compress context when approaching token limit.'}
          tooltip={tip('compression.enabled')}
          value={getField(['compression', 'enabled']) !== false}
          onChange={v => setField(['compression', 'enabled'], v)}
        />
        <NumberField
          label={es.compressionThreshold || 'Threshold'}
          desc={es.compressionThresholdDesc || 'Compress when context usage exceeds this ratio (0-1).'}
          tooltip={tip('compression.threshold')}
          value={getField(['compression', 'threshold'])}
          onChange={v => setField(['compression', 'threshold'], v)}
          min={0} max={1} step={0.05}
        />
        <NumberField
          label={es.compressionTargetRatio || 'Target Ratio'}
          desc={es.compressionTargetRatioDesc || 'Fraction of threshold to preserve as recent tail.'}
          tooltip={tip('compression.target_ratio')}
          value={getField(['compression', 'target_ratio'])}
          onChange={v => setField(['compression', 'target_ratio'], v)}
          min={0} max={1} step={0.05}
        />
        <NumberField
          label={es.protectLastN || 'Protect Last N'}
          desc={es.protectLastNDesc || 'Minimum recent messages to keep uncompressed.'}
          tooltip={tip('compression.protect_last_n')}
          value={getField(['compression', 'protect_last_n'])}
          onChange={v => setField(['compression', 'protect_last_n'], v)}
          min={0}
        />
        <TextField
          label={es.summaryModel || 'Compression Model'}
          desc={es.summaryModelDesc || 'Override the model used by context compression (empty = auto).'}
          tooltip={tip('auxiliary.compression.model')}
          value={getField(['auxiliary', 'compression', 'model']) || ''}
          onChange={v => setField(['auxiliary', 'compression', 'model'], v)}
          placeholder=""
        />
      </ConfigSection>

      {/* Smart Model Routing */}
      <ConfigSection title={es.smartRouting || 'Smart Model Routing'} icon="alt_route" iconColor="text-violet-500" defaultOpen={false}>
        <SwitchField
          label={es.smartRoutingEnabled || 'Enable Smart Routing'}
          desc={es.smartRoutingEnabledDesc || 'Route simple queries to a cheaper/faster model.'}
          tooltip={tip('smart_model_routing.enabled')}
          value={getField(['smart_model_routing', 'enabled']) === true}
          onChange={v => setField(['smart_model_routing', 'enabled'], v)}
        />
        <NumberField
          label={es.maxSimpleChars || 'Max Simple Chars'}
          tooltip={tip('smart_model_routing.max_simple_chars')}
          value={getField(['smart_model_routing', 'max_simple_chars'])}
          onChange={v => setField(['smart_model_routing', 'max_simple_chars'], v)}
          min={1}
        />
        <NumberField
          label={es.maxSimpleWords || 'Max Simple Words'}
          tooltip={tip('smart_model_routing.max_simple_words')}
          value={getField(['smart_model_routing', 'max_simple_words'])}
          onChange={v => setField(['smart_model_routing', 'max_simple_words'], v)}
          min={1}
        />
      </ConfigSection>
    </div>
  );
};
