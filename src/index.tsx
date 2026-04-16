import React from 'react';
import { createRoot } from 'react-dom/client';
import { settingsManager, ZTrackerSettings } from './components/Settings.js';
import Handlebars from 'handlebars';
import { Generator } from 'sillytavern-utils-lib';
import { st_echo } from 'sillytavern-utils-lib/config';
import { migrateLegacyPromptTemplates } from './config.js';
import { createTrackerActions } from './ui/tracker-actions.js';
import { initializeGlobalUI } from './ui/ui-init.js';
import { ensureZTrackerSystemPromptPresetInstalled } from './system-prompt.js';
import { registerZTrackerMacro } from './tracker-macro.js';
import {
  renderTracker,
} from './tracker.js';

// --- Constants and Globals ---
const globalContext = SillyTavern.getContext();
const generator = new Generator();
const pendingRequests = new Map<number, string>();
const renderTrackerWithDeps = (messageId: number) =>
  renderTracker(messageId, { context: globalContext, document, handlebars: Handlebars });

// --- Handlebars Helper ---
if (!Handlebars.helpers['join']) {
  Handlebars.registerHelper('join', function (array: any, separator: any) {
    if (Array.isArray(array)) {
      return array.join(typeof separator === 'string' ? separator : ', ');
    }
    return '';
  });
}

// --- Core Logic Functions (ported from original index.ts) ---

// --- Main Application Entry ---

function renderReactSettings() {
  const settingsContainer = document.getElementById('extensions_settings');
  if (!settingsContainer) {
    console.error('zTracker: Extension settings container not found.');
    return;
  }

  let reactRootEl = document.getElementById('ztracker-react-settings-root');
  if (!reactRootEl) {
    reactRootEl = document.createElement('div');
    reactRootEl.id = 'ztracker-react-settings-root';
    settingsContainer.appendChild(reactRootEl);
  }

  const root = createRoot(reactRootEl);
  root.render(
    <React.StrictMode>
      <ZTrackerSettings />
    </React.StrictMode>,
  );
}

async function main() {
  console.log('[zTracker] Main function reached.');

  // STUB: Minimal registration directly in main loop
  try {
      const context = SillyTavern.getContext() as any;
      if (context.macros?.register) {
          context.macros.register('zHello', {
              description: 'Minimal stub',
              handler: () => 'Hello from zTracker stub!',
          });
          console.log('[zTracker] Stub {{zHello}} registered via modern API');
      } else if (typeof context.registerMacro === 'function') {
          context.registerMacro('zHello', () => 'Hello from zTracker legacy stub!');
          console.log('[zTracker] Stub {{zHello}} registered via legacy API');
      }
  } catch (e) {
      console.error('[zTracker] Failed to register stub macro:', e);
  }

  if (migrateLegacyPromptTemplates(settingsManager.getSettings())) {
    settingsManager.saveSettings();
  }

  try {
    await ensureZTrackerSystemPromptPresetInstalled();
  } catch (error) {
    console.warn('zTracker: failed to ensure the recommended system prompt preset exists.', error);
  }

  const actions = createTrackerActions({
    globalContext,
    settingsManager,
    generator,
    pendingRequests,
    renderTrackerWithDeps,
    importMetaUrl: import.meta.url,
  });

  renderReactSettings();
  initializeGlobalUI({
    globalContext,
    settingsManager,
    actions,
    renderTrackerWithDeps,
  });
}

settingsManager
  .initializeSettings()
  .then(main)
  .catch((error) => {
    console.error(error);
    st_echo('error', 'zTracker data migration failed. Check console for details.');
  });

