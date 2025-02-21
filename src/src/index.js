import React from 'react';
import { createRoot } from 'react-dom/client';
import * as serviceWorker from './serviceWorker';

import './index.css';
import App from './App';
import packageInfo from '../package.json';

import { ThemeProvider, StyledEngineProvider } from '@mui/material/styles';
import { StylesProvider, createGenerateClassName } from '@mui/styles';
import {Theme, Utils} from '@iobroker/adapter-react-v5';

let themeName = Utils.getThemeName();

console.log(`iobroker.scenes@${packageInfo.version}`);

const generateClassName = createGenerateClassName({
    productionPrefix: 'kp3',
});

function build() {
    const container = document.getElementById('root');
    const root = createRoot(container);
    return root.render(
        <StylesProvider generateClassName={generateClassName}>
            <StyledEngineProvider injectFirst>
                <ThemeProvider theme={Theme(themeName)}>
                    <App
                        onThemeChange={_theme => {
                            themeName = _theme;
                            build();
                        }}
                    />
                </ThemeProvider>
            </StyledEngineProvider>
        </StylesProvider>);
}

build();

// If you want your app to work offline and load faster, you can change
// unregister() to register() below. Note this comes with some pitfalls.
// Learn more about service workers: http://bit.ly/CRA-PWA
serviceWorker.unregister();