const SCREENS = [
  { title: 'Afinador', hint: 'Em breve (M1)' },
  { title: 'Praticar', hint: 'Em breve (M3)' },
  { title: 'Músicas', hint: 'Em breve (M6)' },
];

export function App() {
  return (
    <main class="home">
      <h1>GuitarThrow</h1>
      <ul class="menu">
        {SCREENS.map((s) => (
          <li key={s.title}>
            <button disabled>
              <strong>{s.title}</strong>
              <span>{s.hint}</span>
            </button>
          </li>
        ))}
      </ul>
      <footer>versão {__BUILD_ID__}</footer>
    </main>
  );
}
