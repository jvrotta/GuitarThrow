import { render } from 'preact';
import { App } from './ui';
import './ui/styles.css';
import './ui/pages.css';
import './ui/tuner/tuner.css';
import './ui/practice/practice.css';

render(<App />, document.getElementById('app')!);
