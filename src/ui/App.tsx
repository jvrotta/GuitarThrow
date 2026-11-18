import { useState } from 'preact/hooks';
import { Home } from './Home';
import { Tuner } from './Tuner';
import { usePitch } from './usePitch';

type Screen = 'home' | 'tuner';

export function App() {
  // The mic session lives here so it can be started inside the very tap that opens a screen
  // (iOS only allows audio to start from a user gesture) — no extra "activate" step.
  const pitch = usePitch();
  const [screen, setScreen] = useState<Screen>('home');

  if (screen === 'tuner') {
    return (
      <Tuner
        p={pitch}
        onBack={() => {
          pitch.stop();
          setScreen('home');
        }}
      />
    );
  }
  return (
    <Home
      onTuner={() => {
        pitch.start();
        setScreen('tuner');
      }}
    />
  );
}
