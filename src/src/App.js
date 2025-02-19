import React from 'react';
import { withStyles } from '@mui/styles';
import { ThemeProvider, StyledEngineProvider } from '@mui/material/styles';

import AppBar from '@mui/material/AppBar';
import Tabs from '@mui/material/Tabs';
import Tab from '@mui/material/Tab';

import { ColorPicker, Router, Loader, I18n }  from '@iobroker/adapter-react-v5';
import { GenericApp} from '@iobroker/adapter-react-v5';
import { Message as DialogMessage } from '@iobroker/adapter-react-v5';

import logo from './logo.svg';
import './App.css';

console.log("llknm");

class App extends GenericApp {
  constructor(props) {
      const extendedProps = { ...props };
      extendedProps.encryptedFields = ['pass']; // this parameter will be encrypted and decrypted automatically
      extendedProps.translations = {
           en: require('./i18n/en'),
      //     de: require('./i18n/de'),
      //     ru: require('./i18n/ru'),
      //     pt: require('./i18n/pt'),
      //     nl: require('./i18n/nl'),
      //     fr: require('./i18n/fr'),
      //     it: require('./i18n/it'),
      //     es: require('./i18n/es'),
      //     pl: require('./i18n/pl'),
      //     uk: require('./i18n/uk'),
      //     'zh-cn': require('./i18n/zh-cn'),
      };
      // get actual admin port
      extendedProps.socket = { port: parseInt(window.location.port, 10) };

      // Only if close, save buttons are not required at the bottom (e.g. if admin tab)
      // extendedProps.bottomButtons = false;

      // only for debug purposes
      if (extendedProps.socket.port === 3000) {
          extendedProps.socket.port = 8081;
      }

      // allow to manage GenericApp the sentry initialisation or do not set the sentryDSN if no sentry available
      extendedProps.sentryDSN = 'https://yyy@sentry.iobroker.net/xx';

      super(props, extendedProps);

      console.log("------test 1");
  }
  // ...
  onPrepareLoad(settings) {
    settings.pass = this.decode(settings.pass);
    console.log("prepare");
  }
  onPrepareSave(settings) {
    settings.pass = this.encode(settings.pass);
  }

  renderMessage() {
    console.log("render message");
    return <DialogMessage
      title="hallo"
      onClose={() => this.setState({messageText: ''})}
    >
    {"hallo"}
    </DialogMessage>
  }

  render() {
    console.log("----------- render");
    if (!this.state.loaded) {
        return <StyledEngineProvider injectFirst>
            <ThemeProvider theme={this.state.theme}>
                <Loader themeType={this.state.themeType} />
            </ThemeProvider>
        </StyledEngineProvider>;
    }
  }
}

export default App;
