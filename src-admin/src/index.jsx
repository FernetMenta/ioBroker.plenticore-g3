import React from 'react';
import { createRoot } from 'react-dom/client';

import './index.css';
import App from './App';

/** Renders the app into the DOM */
function build() {
    const container = document.getElementById('root');
    const root = createRoot(container);
    root.render(<App adapterName="plenticore-g3" />);
}

build();
