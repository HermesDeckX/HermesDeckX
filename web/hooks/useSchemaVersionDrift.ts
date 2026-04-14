import { useState, useEffect, useCallback, useRef } from 'react';
import { gwApi } from '../services/api';

/**
 * Storage keys for schema version tracking.
 */
const SCHEMA_VERSION_KEY = 'hermesdeckx:schema-version';
const SCHEMA_FIELD_COUNT_KEY = 'hermesdeckx:schema-field-count';
const SCHEMA_CHECK_TS_KEY = 'hermesdeckx:schema-check-ts';

/**
 * Minimum interval between rechecks (ms). Default: 6 hours.
 */
const RECHECK_INTERVAL_MS = 6 * 60 * 60 * 1000;

export interface SchemaVersionDrift {
  /** true after the first check completes */
  checked: boolean;
  /** Schema version returned by the gateway (if available) */
  currentVersion: string | null;
  /** Last-known schema version from localStorage */
  previousVersion: string | null;
  /** Whether the schema version has changed since last check */
  versionChanged: boolean;
  /** Number of fields in the current schema */
  currentFieldCount: number;
  /** Number of fields in the previous schema */
  previousFieldCount: number;
  /** Net change in field count */
  fieldCountDelta: number;
  /** Force a recheck */
  recheck: () => void;
  /** Mark the current version as acknowledged (dismiss notification) */
  acknowledge: () => void;
}

/**
 * Extract all leaf-level dotted keys from a JSON Schema.
 */
function extractSchemaKeys(schema: any, prefix = ''): string[] {
  if (!schema?.properties) return prefix ? [prefix] : [];
  const keys: string[] = [];
  for (const [key, sub] of Object.entries(schema.properties)) {
    const path = prefix ? `${prefix}.${key}` : key;
    const subSchema = sub as any;
    if (subSchema.properties) {
      keys.push(...extractSchemaKeys(subSchema, path));
    } else {
      keys.push(path);
    }
  }
  return keys;
}

/**
 * useSchemaVersionDrift — Detects when the Hermes Agent config schema
 * version or field count changes compared to the last known state.
 *
 * This enables proactive notifications to the user that they should
 * review the config editor for new/removed fields.
 */
export function useSchemaVersionDrift(): SchemaVersionDrift {
  const [checked, setChecked] = useState(false);
  const [currentVersion, setCurrentVersion] = useState<string | null>(null);
  const [previousVersion, setPreviousVersion] = useState<string | null>(null);
  const [versionChanged, setVersionChanged] = useState(false);
  const [currentFieldCount, setCurrentFieldCount] = useState(0);
  const [previousFieldCount, setPreviousFieldCount] = useState(0);
  const [fieldCountDelta, setFieldCountDelta] = useState(0);
  const recheckRef = useRef(0);

  const performCheck = useCallback(async () => {
    try {
      // Throttle: skip if checked recently (unless forced)
      const lastCheck = Number(localStorage.getItem(SCHEMA_CHECK_TS_KEY) || '0');
      if (recheckRef.current === 0 && Date.now() - lastCheck < RECHECK_INTERVAL_MS) {
        // Use cached values
        const storedVersion = localStorage.getItem(SCHEMA_VERSION_KEY);
        const storedCount = Number(localStorage.getItem(SCHEMA_FIELD_COUNT_KEY) || '0');
        setPreviousVersion(storedVersion);
        setPreviousFieldCount(storedCount);
        setCurrentVersion(storedVersion);
        setCurrentFieldCount(storedCount);
        setVersionChanged(false);
        setFieldCountDelta(0);
        setChecked(true);
        return;
      }

      const res = await gwApi.configSchema() as any;
      const schemaObj = res?.schema || res;
      const version = res?.version || res?.hermesagentVersion || null;

      const keys = schemaObj?.properties ? extractSchemaKeys(schemaObj) : [];
      const fieldCount = keys.length;

      // Load previous state
      const storedVersion = localStorage.getItem(SCHEMA_VERSION_KEY);
      const storedCount = Number(localStorage.getItem(SCHEMA_FIELD_COUNT_KEY) || '0');

      setPreviousVersion(storedVersion);
      setPreviousFieldCount(storedCount);
      setCurrentVersion(version);
      setCurrentFieldCount(fieldCount);

      const verChanged = storedVersion !== null && version !== null && storedVersion !== version;
      const delta = storedCount > 0 ? fieldCount - storedCount : 0;

      setVersionChanged(verChanged);
      setFieldCountDelta(delta);

      // Update stored values
      if (version) localStorage.setItem(SCHEMA_VERSION_KEY, version);
      localStorage.setItem(SCHEMA_FIELD_COUNT_KEY, String(fieldCount));
      localStorage.setItem(SCHEMA_CHECK_TS_KEY, String(Date.now()));

      setChecked(true);
    } catch {
      // Gateway may be offline — that's fine, just mark as checked
      setChecked(true);
    }
  }, []);

  useEffect(() => {
    performCheck();
  }, [performCheck]);

  const recheck = useCallback(() => {
    recheckRef.current++;
    // Clear throttle timestamp to force recheck
    localStorage.removeItem(SCHEMA_CHECK_TS_KEY);
    performCheck();
  }, [performCheck]);

  const acknowledge = useCallback(() => {
    // Update stored version to current, clearing the drift notification
    if (currentVersion) localStorage.setItem(SCHEMA_VERSION_KEY, currentVersion);
    localStorage.setItem(SCHEMA_FIELD_COUNT_KEY, String(currentFieldCount));
    setVersionChanged(false);
    setFieldCountDelta(0);
    setPreviousVersion(currentVersion);
    setPreviousFieldCount(currentFieldCount);
  }, [currentVersion, currentFieldCount]);

  return {
    checked,
    currentVersion,
    previousVersion,
    versionChanged,
    currentFieldCount,
    previousFieldCount,
    fieldCountDelta,
    recheck,
    acknowledge,
  };
}
