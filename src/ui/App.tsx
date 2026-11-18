import { useState } from 'preact/hooks';
import { Home } from './Home';
import { Library } from './Library';
import { Practice } from './practice/Practice';
import { Tuner } from './Tuner';
import { usePitch } from './usePitch';

type Screen = { name: 'home' } | { name: 'tuner' } | { name: 'library' } | { name: 'song'; id: string };

export function App() {
  // The mic session lives here so it can be started inside the very tap that opens a screen
  // (iOS only allows audio to start from a user gesture) — no extra "activate" step.
  const [screen, setScreen] = useState<Screen>({ name: 'home' });
  const pitch = usePitch(screen.name === 'tuner');
  const home = () => setScreen({ name: 'home' });

  switch (screen.name) {
    case 'tuner':
      return (
        <Tuner
          p={pitch}
          onBack={() => {
            pitch.stop();
            home();
          }}
        />
      );
    case 'library':
      return (
        <Library
          onBack={home}
          onOpen={(id) => {
            pitch.start();
            setScreen({ name: 'song', id });
          }}
        />
      );
    case 'song':
      return (
        <Practice
          id={screen.id}
          p={pitch}
          onBack={() => {
            pitch.stop();
            setScreen({ name: 'library' });
          }}
        />
      );
    default:
      return (
        <Home
          onTuner={() => {
            pitch.start();
            setScreen({ name: 'tuner' });
          }}
          onLibrary={() => setScreen({ name: 'library' })}
        />
      );
  }
}
