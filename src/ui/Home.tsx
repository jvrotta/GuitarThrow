import { Logo, MusicIcon, TunerIcon } from './icons';

const SOON = [
  { title: 'Acordes', text: 'Reconhecer acordes inteiros, não só uma nota' },
  { title: 'Play-along', text: 'Toque junto no andamento, com pontuação' },
];

export function Home({ onTuner, onLibrary }: { onTuner: () => void; onLibrary: () => void }) {
  return (
    <main class="home">
      <header class="brand">
        <Logo />
        <div>
          <h1>GuitarThrow</h1>
          <p>Seu guia de prática de violão</p>
        </div>
      </header>

      <div class="home-body">
        <button class="hero-card" onClick={onLibrary}>
          <span class="hero-icon">
            <MusicIcon />
          </span>
          <span class="hero-text">
            <strong>Músicas</strong>
            <span>Modo Espera: só avança quando você acerta a nota</span>
          </span>
          <span class="chevron">›</span>
        </button>

        <button class="hero-card secondary" onClick={onTuner}>
          <span class="hero-icon">
            <TunerIcon />
          </span>
          <span class="hero-text">
            <strong>Afinador</strong>
            <span>Afine as 6 cordas</span>
          </span>
          <span class="chevron">›</span>
        </button>

        <section class="soon">
          <h3>Em breve</h3>
          {SOON.map((s) => (
            <div class="soon-item" key={s.title}>
              <strong>{s.title}</strong>
              <span>{s.text}</span>
            </div>
          ))}
        </section>
      </div>

      <footer>versão {__BUILD_ID__}</footer>
    </main>
  );
}
