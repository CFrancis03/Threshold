import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

// Latin subsets only, weight axis only — enough for every size we set, and a
// third of the bytes of the full optical-size files.
import '@fontsource-variable/newsreader/wght.css';
import '@fontsource-variable/ibm-plex-sans/wght.css';
import '@fontsource/ibm-plex-mono/latin-400.css';
import '@fontsource/ibm-plex-mono/latin-500.css';

import './styles/tokens.css';
import './styles/base.css';
import './styles/type.css';

import { App } from './App';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
