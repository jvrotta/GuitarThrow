import { useState } from 'preact/hooks';
import { Tuner } from './Tuner';

type Screen = 'home' | 'tuner';

const MENU: { title: string; hint: string; screen?: Screen }[] = [
  { title: 'Afinador', hint: 'Afine e teste o microfone', screen: 'tuner' },
  { title: 'Praticar', hint: 'Em breve (M3)' },
  { title: 'Músicas', hint: 'Em breve (M6)' },
];

export function App() {
  const [screen, setScreen] = useState<Screen>('home');
  if (screen === 'tuner') return <Tuner onBack={() => setScreen('home')} />;

  return (
    <main class="home">
      <h1>GuitarThrow</h1>
      <ul class="menu">
        {MENU.map((m) => (
          <li key={m.title}>
            <button disabled={!m.screen} onClick={() => m.screen && setScreen(m.screen)}>
              <strong>{m.title}</strong>
              <span>{m.hint}</span>
            </button>
          </li>
        ))}
      </ul>
      <footer>versão {__BUILD_ID__}</footer>
    </main>
  );
}
