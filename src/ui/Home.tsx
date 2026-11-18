import { Logo, TunerIcon } from './icons';

const SOON = [
  { title: 'Praticar', text: 'Modo Espera e Play-along com a tab rolando' },
  { title: 'Músicas', text: 'Exercícios e músicas de domínio público' },
];

export function Home({ onTuner }: { onTuner: () => void }) {
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
        <button class="hero-card" onClick={onTuner}>
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
