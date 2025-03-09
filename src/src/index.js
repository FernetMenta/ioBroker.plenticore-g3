import React from 'react';
import { createRoot } from 'react-dom/client';
import * as serviceWorker from './serviceWorker';

import './index.css';
import App from './App';
import packageInfo from '../package.json';

console.log(`iobroker.scenes@${packageInfo.version}`);

function build () {
  const container = document.getElementById('root');
  const root = createRoot(container);
  root.render(<App 
               adapterName="plenticore-g3"/>);
}

build();

// If you want your app to work offline and load faster, you can change
// unregister() to register() below. Note this comes with some pitfalls.
// Learn more about service workers: http://bit.ly/CRA-PWA
serviceWorker.unregister();
