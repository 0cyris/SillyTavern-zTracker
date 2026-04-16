import type { ExtensionSettings } from './config.js';
import { DEFAULT_EMBED_SNAPSHOT_HEADER } from './config.js';
import { EXTENSION_KEY } from './extension-metadata.js';
import { CHAT_MESSAGE_SCHEMA_VALUE_KEY } from './tracker.js';
import { formatEmbeddedTrackerSnapshot } from './embed-snapshot-transform.js';

type MacroTrackerMessageLike = {
  extra?: Record<string, any>;
  source?: { extra?: Record<string, any> };
};

type MacroContextLike = {
  chat?: MacroTrackerMessageLike[];
  macros?: {
    register?: (
      name: string,
      definition: {
        description?: string;
        category?: unknown;
        handler: (macroContext?: { env?: { chat?: MacroTrackerMessageLike[] } }) => string;
      },
    ) => void;
    registry?: {
      unregisterMacro?: (name: string) => void;
    };
    unregisterMacro?: (name: string) => void;
    category?: Record<string, unknown>;
  };
};

type MacroSettings = Pick<
  ExtensionSettings,
  'embedZTrackerSnapshotHeader' | 'embedZTrackerSnapshotTransformPreset' | 'embedZTrackerSnapshotTransformPresets' | 'debugLogging'
>;

type MacroSettingsGetter = () => MacroSettings;

function getMessageTrackerExtra(message: MacroTrackerMessageLike | undefined): Record<string, any> | undefined {
  if (!message) return undefined;
  return message.extra ?? message.source?.extra;
}

export function findLatestTrackerMessage(messages: MacroTrackerMessageLike[] | undefined): MacroTrackerMessageLike | undefined {
  if (!Array.isArray(messages) || messages.length === 0) return undefined;

  for (let index = messages.length - 1; index >= 0; index -= 1) {
    const message = messages[index];
    const extra = getMessageTrackerExtra(message);
    if (extra?.[EXTENSION_KEY]?.[CHAT_MESSAGE_SCHEMA_VALUE_KEY]) {
      return message;
    }
  }

  return undefined;
}

export function buildZTrackerMacroText(messages: MacroTrackerMessageLike[] | undefined, settings: MacroSettings): string {
  const trackerMessage = findLatestTrackerMessage(messages);
  const trackerValue = trackerMessage ? getMessageTrackerExtra(trackerMessage)?.[EXTENSION_KEY]?.[CHAT_MESSAGE_SCHEMA_VALUE_KEY] : undefined;

  if (!trackerValue) {
    return settings.debugLogging ? '<!-- zTracker: no tracker snapshot available -->' : '';
  }

  const { lang, text, wrapInCodeFence } = formatEmbeddedTrackerSnapshot(trackerValue, settings);
  const header = settings.embedZTrackerSnapshotHeader ?? DEFAULT_EMBED_SNAPSHOT_HEADER;
  const prefix = header ? `${header}\n` : '';

  return wrapInCodeFence ? `${prefix}\`\`\`${lang}\n${text}\n\`\`\`` : `${prefix}${text}`;
}

function unregisterExistingMacro(macros: NonNullable<MacroContextLike['macros']>): void {
  macros.registry?.unregisterMacro?.('zTracker');
  macros.unregisterMacro?.('zTracker');
}

/** Registers the synchronous zTracker macro used for manual prompt injection. */
export function registerZTrackerMacro(getContext: () => MacroContextLike, getSettings: MacroSettingsGetter): boolean {
  const context = getContext();
  const macros = context.macros;
  if (!macros?.register) return false;

  unregisterExistingMacro(macros);

  macros.register('zTracker', {
    description: 'Returns the most recent zTracker snapshot as prompt text.',
    category: macros.category?.UTILITY,
    handler: (macroContext) => buildZTrackerMacroText(macroContext?.env?.chat ?? getContext().chat, getSettings()),
  });

  return true;
}
