import React from 'react';
import { ThemeProvider, StyledEngineProvider } from '@mui/material/styles';

import AppBar from '@mui/material/AppBar';
import Tabs from '@mui/material/Tabs';
import Tab from '@mui/material/Tab';
import Box from '@mui/material/Box';

import { GenericApp, Router, Loader, I18n } from '@iobroker/adapter-react-v5';

import TabBaseConfig from './Tabs/BaseConfig';
import TabOptionalData from './Tabs/OptionalData';

const styles = {
    root: {},
    tabContent: {
        p: 5,
        height: 'calc(100% - 64px - 48px - 20px)',
        overflow: 'auto',
    },
    tabContentIFrame: {
        padding: 5,
        height: 'calc(100% - 64px - 48px - 20px - 38px)',
        overflow: 'auto',
    },
};

/**
 * Base class for the admin UI
 */
class App extends GenericApp {
    /**
     * @param {object} props - react properties including 'adapterName'
     */
    constructor(props) {
        const extendedProps = { ...props };
        extendedProps.encryptedFields = ['pass']; // this parameter will be encrypted and decrypted automatically
        extendedProps.translations = {
            en: require('./i18n/en'),
            de: require('./i18n/de'),
            ru: require('./i18n/ru'),
            pt: require('./i18n/pt'),
            nl: require('./i18n/nl'),
            fr: require('./i18n/fr'),
            it: require('./i18n/it'),
            es: require('./i18n/es'),
            pl: require('./i18n/pl'),
            uk: require('./i18n/uk'),
            'zh-cn': require('./i18n/zh-cn'),
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

    /**
     * returns index of selected tab
     */
    getSelectedTab() {
        const tab = this.state.selectedTab;
        if (!tab || tab === 'config') {
            return 0;
        } else if (tab === 'processdata') {
            return 1;
        } else if (tab === 'settings') {
            return 2;
        }
    }

    /**
     * renders an AppBar with Tabs
     */
    renderTabsForConfig() {
        return (
            <>
                <AppBar position="static">
                    <Tabs
                        value={this.getSelectedTab()}
                        onChange={e => Router.doNavigate(e.target.dataset.name)}
                        textColor="secondary"
                        indicatorColor="secondary"
                    >
                        <Tab
                            label={I18n.t('Base Config')}
                            data-name="config"
                        />
                        <Tab
                            label={I18n.t('Process Data')}
                            data-name="processdata"
                        />
                        <Tab
                            label={I18n.t('Settings')}
                            data-name="settings"
                        />
                    </Tabs>
                </AppBar>

                <Box
                    component="div"
                    sx={{ ...(this.isIFrame ? styles.tabContentIFrame : styles.tabContent) }}
                >
                    {(this.state.selectedTab === 'config' || !this.state.selectedTab) && (
                        <TabBaseConfig
                            key="config"
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
                    {this.state.selectedTab === 'processdata' && (
                        <TabOptionalData
                            key="processdata"
                            type="processdata"
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
                    {this.state.selectedTab === 'settings' && (
                        <TabOptionalData
                            key="settings"
                            type="settings"
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
                </Box>
                {this.renderSaveCloseButtons()}
            </>
        );
    }

    /**
     * renders this component
     */
    render() {
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
                        className="App"
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

export default App;
