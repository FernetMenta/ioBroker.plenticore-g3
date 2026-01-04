'use strict';

/*
 * Created with @iobroker/create-adapter v2.6.5
 */

// The adapter-core module gives you access to the core ioBroker functions
// you need to create an adapter
const utils = require('@iobroker/adapter-core');
const I18n = require('@iobroker/adapter-core').I18n;

// Load your modules here, e.g.:
// const fs = require("fs");
const path = require('path');
const PlenticoreAPI = require('./lib/plenticoreAPI.js');
const PlenticoreData = require('./lib/plenticoredata.js');

const InitState = {
    Uninit: 0,
    PreInit: 1,
    Init: 2,
};

class PlenticoreG3 extends utils.Adapter {
    #plenticoreAPI;
    #processdata;
    #settings;
    #mainlooptimer;
    #initState = InitState.Uninit;
    #initCounter = 0;
    #lastUpdateCheck = 0;
    #hasBattery = false;
    /**
     * @param {Partial<utils.AdapterOptions>} [options] - options given from iobroker
     */
    constructor(options) {
        super({
            ...options,
            name: 'plenticore-g3',
        });
        this.on('ready', this.onReady.bind(this));
        this.on('stateChange', this.onStateChange.bind(this));
        // this.on("objectChange", this.onObjectChange.bind(this));
        // this.on("message", this.onMessage.bind(this));
        this.on('unload', this.onUnload.bind(this));
    }

    setBatteryPresence(presence) {
        this.#hasBattery = presence;
    }

    getBatteryPresence() {
        return this.#hasBattery;
    }

    /**
     * Is called when databases are connected and adapter received configuration.
     */
    async onReady() {
        // Initialize your adapter here
        await I18n.init(path.join(__dirname, 'lib'), this);

        // make sure interval is between expected values
        if (this.config.pollinginterval < 5) {
            this.config.pollinginterval = 5;
        } else if (this.config.pollinginterval > 60) {
            this.config.pollinginterval = 60;
        }

        // make sure timeout is between expected values
        if (this.config.apitimeout < 5) {
            this.config.apitimeout = 5;
        } else if (this.config.apitimeout > 30) {
            this.config.apitimeout = 30;
        }

        // Reset the connection indicator during startup
        this.setState('info.connection', false, true);

        this.#processdata = new PlenticoreData(this, I18n, 'processdata');
        this.#settings = new PlenticoreData(this, I18n, 'settings');

        this.#plenticoreAPI = new PlenticoreAPI(
            this.config.host,
            this.config.port,
            this.config.https,
            this.config.password,
            this.config.apitimeout,
            this.log,
        );
        this.mainloop();
    }

    /**
     * Is called when adapter shuts down - callback has to be called under any circumstances!
     *
     * @param {() => void} callback - call back into iobroker
     */
    onUnload(callback) {
        try {
            // Here you must clear all timeouts or intervals that may still be active
            this.clearTimeout(this.#mainlooptimer);
            this.#plenticoreAPI = null;
            this.setState('info.connection', false, true);
            callback();
        } catch (e) {
            this.log.error(e);
            callback();
        }
    }

    // If you need to react to object changes, uncomment the following block and the corresponding line in the constructor.
    // You also need to subscribe to the objects with `this.subscribeObjects`, similar to `this.subscribeStates`.
    // /**
    //  * Is called if a subscribed object changes
    //  * @param {string} id
    //  * @param {ioBroker.Object | null | undefined} obj
    //  */
    // onObjectChange(id, obj) {
    //     if (obj) {
    //         // The object was changed
    //         this.log.info(`object ${id} changed: ${JSON.stringify(obj)}`);
    //     } else {
    //         // The object was deleted
    //         this.log.info(`object ${id} deleted`);
    //     }
    // }

    /**
     * Is called if a subscribed state changes
     *
     * @param {string} id - id of the state changed
     * @param {ioBroker.State | null | undefined} state - state that was changed
     */
    async onStateChange(id, state) {
        if (state && !state.ack) {
            // The state was changed
            this.log.silly(`state ${id} changed: ${state.val} (ack = ${state.ack})`);
            if (!id) {
                return;
            }
            let payload = await this.#settings.prepareWriteValue(id, state);
            try {
                await this.#plenticoreAPI.writeSetting(payload);
                this.setState(id, state, true);
                this.log.silly('successfully written value');
            } catch (e) {
                this.log.warn(`cannot write state ${id} with value ${state.val} - error: ${e}`);
            }
        }
    }

    // If you need to accept messages in your adapter, uncomment the following block and the corresponding line in the constructor.
    // /**
    //  * Some message was sent to this instance over message box. Used by email, pushover, text2speech, ...
    //  * Using this method requires "common.messagebox" property to be set to true in io-package.json
    //  * @param {ioBroker.Message} obj
    //  */
    // onMessage(obj) {
    //     if (typeof obj === "object" && obj.message) {
    //         if (obj.command === "send") {
    //             // e.g. send email or pushover or whatever
    //             this.log.info("send command");

    //             // Send response in callback if required
    //             if (obj.callback) this.sendTo(obj.from, obj.command, "Message received", obj.callback);
    //         }
    //     }
    // }

    // main loop for polling and sending data
    async mainloop() {
        let inverterState = 0;

        if (!this.#plenticoreAPI.loggedIn) {
            this.#initState = InitState.Uninit;
            this.#initCounter = 0;
            this.setState('info.connection', false, true);
            try {
                await this.#plenticoreAPI.login();
            } catch (e) {
                if (e == 'auth') {
                    // stop loop due to authorization issue
                    this.log.warn('terminating because of authentication issue');
                    this.terminate();
                } else {
                    this.nextLoop();
                }
                return;
            }
        }

        if (this.#initState != InitState.Init) {
            let inverterStatePoll = PlenticoreData.getPollInverterStateID();
            try {
                let inverterStateResp = await this.#plenticoreAPI.getProcessData(inverterStatePoll);
                inverterState = inverterStateResp[0].processdata[0].value;
                if (this.#initState == InitState.PreInit) {
                    if (inverterState == 6) {
                        this.log.info('Inverter in state FeedIn now, triggering reinit');
                        this.#initState = InitState.Uninit;
                    }
                } else if (inverterState == 6) {
                    this.log.info('Inverter in state FeedIn, starting initialization');
                } else if (this.#initCounter > 5) {
                    this.log.info('Inverter not in state FeedIn, preinitialize');
                } else {
                    this.log.info('Inverter not in state FeedIn, retry ...');
                    this.#initCounter++;
                    this.nextLoop();
                    return;
                }
            } catch (e) {
                this.log.error(`cannot poll inverter state: ${e}`);
                this.nextLoop();
                return;
            }
        }

        if (this.#initState == InitState.Uninit) {
            this.log.info('start init');
            try {
                // want to delete unused objects later
                let allAdapterObjs = await this.getAdapterObjectsAsync();

                // init processdata
                let allProcessData = await this.#plenticoreAPI.getAllProcessData();
                let optionalProcessData;
                try {
                    optionalProcessData = JSON.parse(this.config.pdoptionals);
                } catch {
                    optionalProcessData = [];
                }
                this.#processdata.setAllIDs(allProcessData);
                await this.#processdata.init(optionalProcessData, inverterState == 6 ? allAdapterObjs : undefined);

                // init settings
                let allSettings = await this.#plenticoreAPI.getAllSettings();
                let optionalSettings;
                try {
                    optionalSettings = JSON.parse(this.config.settingoptionals);
                } catch {
                    optionalSettings = [];
                }
                this.#settings.setAllIDs(allSettings);
                await this.#settings.init(optionalSettings, inverterState == 6 ? allAdapterObjs : undefined);

                // subscribe to all settings that are writable
                this.subscribeStates('settings.*');

                // init done
                this.setState('info.connection', true, true);
                if (inverterState == 6) {
                    this.#initState = InitState.Init;
                    this.log.info('init completed');
                } else {
                    this.#initState = InitState.PreInit;
                    this.log.info('preinit completed');
                }
                this.#lastUpdateCheck = 0;
            } catch (e) {
                if (e == 'auth') {
                    // stop loop due to authorization issue
                    this.log.warn('terminating because of authentication issue');
                    this.terminate();
                } else {
                    this.log.debug(`init failed with error: ${e}`);
                    this.nextLoop();
                    return;
                }
            }
        }

        // poll process data and settings
        try {
            let pdPollIDs = this.#processdata.getPollIDs();
            let processData = await this.#plenticoreAPI.getProcessData(pdPollIDs);
            await this.#processdata.processData(processData);

            let settingPollIDs = this.#settings.getPollIDs();
            let settings = await this.#plenticoreAPI.getSettings(settingPollIDs);
            await this.#settings.processData(settings);
        } catch (e) {
            if (e == 'auth') {
                // stop loop due to authorization issue
                this.log.warn('terminating because of authentication issue');
                this.terminate();
            } else {
                this.nextLoop();
                return;
            }
        }

        // check if an update is available to be installed.
        const today = new Date().getDate();
        if (today != this.#lastUpdateCheck) {
            let method = await this.getStateAsync('settings.scb.update.Update_Method');
            if (method != 2) {
                this.log.info('check for update');
                let version = await this.getStateAsync('processdata.scb.update.Update_Version');
                if (version.val != 0) {
                    this.log.info('new update available');
                    let text = I18n.translate('available version');
                    await this.registerNotification('plenticore-g3', 'update', `${text} : ${version.val}`);
                }
            }
            this.#lastUpdateCheck = today;
        }

        // timer for next interval
        this.nextLoop();
    }

    nextLoop() {
        this.#mainlooptimer = this.setTimeout(
            () => {
                this.mainloop();
            },
            parseInt(this.config.pollinginterval) * 1000,
        );
    }
}

if (require.main !== module) {
    // Export the constructor in compact mode
    /**
     * @param {Partial<utils.AdapterOptions>} [options] - options given from iobroker
     */
    module.exports = options => new PlenticoreG3(options);
} else {
    // otherwise start the instance directly
    new PlenticoreG3();
}
