import { useEffect, useState } from 'preact/hooks';
import type { Mode } from '../engine';
import { DEFAULT_SETTINGS, loadSettings, saveSettings, type Settings } from '../storage';
import { Calibrate } from './Calibrate';
import { Home } from './Home';
import { Import } from './Import';
import { Library } from './Library';
import { Practice } from './practice/Practice';
import { SettingsPage } from './SettingsPage';
import { Tuner } from './Tuner';
import { usePitch } from './usePitch';

type Screen =
  | { name: 'home' }
  | { name: 'tuner' }
  | { name: 'library' }
  | { name: 'song'; id: string; mode: Mode }
  | { name: 'settings' }
  | { name: 'calibrate' }
  | { name: 'import' };

export function App() {
  // The mic session lives here so it can be started inside the very tap that opens a screen
  // (iOS only allows audio to start from a user gesture) — no extra "activate" step.
  const [screen, setScreen] = useState<Screen>({ name: 'home' });
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const pitch = usePitch(screen.name === 'tuner');
  const go = (s: Screen) => setScreen(s);
  const leave = (s: Screen) => {
    pitch.stop();
    setScreen(s);
  };
  const open = (id: string, mode: Mode = 'wait') => {
    pitch.start();
    setScreen({ name: 'song', id, mode });
  };
  const changeSettings = (s: Settings) => {
    setSettings(s);
    void saveSettings(s);
  };

  useEffect(() => {
    void loadSettings().then(setSettings);
  }, []);

  switch (screen.name) {
    case 'tuner':
      return <Tuner p={pitch} onBack={() => leave({ name: 'home' })} />;
    case 'library':
      return <Library onBack={() => go({ name: 'home' })} onOpen={(id) => open(id)} onImport={() => go({ name: 'import' })} />;
    case 'import':
      return <Import onBack={() => go({ name: 'library' })} onOpen={(id) => open(id)} />;
    case 'song':
      return <Practice id={screen.id} mode={screen.mode} p={pitch} settings={settings} onBack={() => leave({ name: 'library' })} />;
    case 'settings':
      return (
        <SettingsPage
          settings={settings}
          onChange={changeSettings}
          onBack={() => go({ name: 'home' })}
          onCalibrate={() => {
            pitch.start();
            go({ name: 'calibrate' });
          }}
        />
      );
    case 'calibrate':
      return (
        <Calibrate
          p={pitch}
          onBack={() => leave({ name: 'settings' })}
          onSave={(latencyMs) => {
            changeSettings({ ...settings, latencyMs, calibrated: true });
            leave({ name: 'settings' });
          }}
        />
      );
    default:
      return (
        <Home
          onTuner={() => {
            pitch.start();
            go({ name: 'tuner' });
          }}
          onLibrary={() => go({ name: 'library' })}
          onSettings={() => go({ name: 'settings' })}
          onContinue={open}
        />
      );
  }
}
