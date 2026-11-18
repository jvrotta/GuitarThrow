import { render } from 'preact';
import { App } from './ui';
import './ui/styles.css';
import './ui/pages.css';

render(<App />, document.getElementById('app')!);
