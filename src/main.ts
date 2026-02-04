import './style.css';
import { createInitialState } from './state.ts';
import { initUI, render } from './ui.ts';

const state = createInitialState();
initUI(state, () => render(state));

