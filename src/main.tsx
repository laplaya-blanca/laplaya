import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import './styles.css';

// on a laptop or desktop, mark the page while it scrolls so the looping motion can hold still (styles.css)
if (matchMedia('(hover: hover) and (pointer: fine)').matches) {
  let still = 0;
  addEventListener('scroll', () => {
    if (!still) document.documentElement.classList.add('scrolling');
    clearTimeout(still);
    still = setTimeout(() => { still = 0; document.documentElement.classList.remove('scrolling'); }, 160);
  }, { passive: true });
}

createRoot(document.getElementById('root')!).render(<StrictMode><App /></StrictMode>);
