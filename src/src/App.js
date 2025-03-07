import React from 'react';
import { withStyles } from '@mui/styles';
import { ThemeProvider, StyledEngineProvider } from '@mui/material/styles';

import AppBar from '@mui/material/AppBar';
import Tabs from '@mui/material/Tabs';
import Tab from '@mui/material/Tab';

import { ColorPicker, Router, Loader, I18n } from '@iobroker/adapter-react-v5';
import { GenericApp } from '@iobroker/adapter-react-v5';

// import './App.css';

import TabBaseConfig from './Tabs/BaseConfig';

const styles = theme => ({
  root: {},
  tabContent: {
    padding: 10,
    height: 'calc(100% - 64px - 48px - 20px)',
    overflow: 'auto',
  },
  tabContentIFrame: {
    padding: 10,
    height: 'calc(100% - 64px - 48px - 20px - 38px)',
    overflow: 'auto',
  },
  selected: {
    color: theme.palette.mode === 'dark' ? undefined : '#FFF !important',
  },
  indicator: {
    backgroundColor: theme.palette.mode === 'dark' ? theme.palette.secondary.main : '#FFF',
  },
});

class App extends GenericApp {
  constructor (props) {
    const extendedProps = { ...props };
    extendedProps.encryptedFields = ['pass']; // this parameter will be encrypted and decrypted automatically
    extendedProps.translations = {
      en: require('./i18n/en'),
      de: require('./i18n/de'),
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
  }
  // ...

  getSelectedTab () {
    const tab = this.state.selectedTab;
    if (!tab || tab === 'config') {
      return 0;
    } else if (tab === 'list') {
      return 1;
    } else if (tab === 'pdf') {
      return 2;
    }
  }

  renderTabsForConfig () {
    return (
      <>
        <AppBar position='static'>
          <Tabs
            value={this.getSelectedTab()}
            onChange={e => Router.doNavigate(e.target.dataset.name)}
            classes={{ indicator: this.props.classes.indicator }}
          >
            <Tab
              classes={{ selected: this.props.classes.selected }}
              label={I18n.t('Base Config')}
              data-name='config'
            />
          </Tabs>
        </AppBar>

        <div
          className={
            this.isIFrame ? this.props.classes.tabContentIFrame : this.props.classes.tabContent
          }
        >
          {(this.state.selectedTab === 'config' || !this.state.selectedTab) && (
            <TabBaseConfig
              key='config'
              common={this.common}
              socket={this.socket}
              native={this.state.native}
              onError={text =>
                this.setState({
                  errorText:
                    (text || text === 0) && typeof text !== 'string' ? text.toString() : text,
                })
              }
              onLoad={native => this.onLoadConfig(native)}
              instance={this.instance}
              adapterName={this.adapterName}
              changed={this.state.changed}
              onChange={(attr, value, cb) => this.updateNativeValue(attr, value, cb)}
            />
          )}
        </div>
        {this.renderSaveCloseButtons()}
      </>
    );
  }

  render () {
    if (!this.state.loaded) {
      return (
        <StyledEngineProvider injectFirst>
          <ThemeProvider theme={this.state.theme}>
            <Loader themeType={this.state.themeType} />
          </ThemeProvider>
        </StyledEngineProvider>
      );
    }

    return (
      <StyledEngineProvider injectFirst>
        <ThemeProvider theme={this.state.theme}>
          <div
            className='App'
            style={{
              background: this.state.theme.palette.background.default,
              color: this.state.theme.palette.text.primary,
            }}
          >
            {!this.isTab ? this.renderTabsForConfig() : this.renderEventList()}
            {this.renderError()}
          </div>
        </ThemeProvider>
      </StyledEngineProvider>
    );
  }
}

export default withStyles(styles)(App);
