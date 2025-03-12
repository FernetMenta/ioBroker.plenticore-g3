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

class PlenticoreG3 extends utils.Adapter {
    #plenticoreAPI;
    #processdata;
    #settings;
    #mainlooptimer;
    /**
     * @param {Partial<utils.AdapterOptions>} [options]
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

    /**
     * Is called when databases are connected and adapter received configuration.
     */
    async onReady() {
        // Initialize your adapter here
        if (this.config.language != '') {
            console.log(`init to: ${this.config.language}`);
            await I18n.init(path.join(__dirname, 'lib'), this.config.language);
        } else {
            await I18n.init(path.join(__dirname, 'lib'), this);
        }

        console.log(I18n.translate('Grid_P'));

        // Reset the connection indicator during startup
        this.setState('info.connection', false, true);

        this.#processdata = new PlenticoreData(this, I18n, 'processdata');
        this.#settings = new PlenticoreData(this, I18n, 'settings');

        this.#plenticoreAPI = new PlenticoreAPI(
            this.config.host,
            this.config.port,
            this.config.https,
            this.config.password,
            this.log,
        );
        this.mainloop();
    }

    /**
     * Is called when adapter shuts down - callback has to be called under any circumstances!
     *
     * @param {() => void} callback
     */
    onUnload(callback) {
        try {
            // Here you must clear all timeouts or intervals that may still be active
            clearTimeout(this.#mainlooptimer);
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
     * @param {string} id
     * @param {ioBroker.State | null | undefined} state
     */
    async onStateChange(id, state) {
        if (state && !state.ack) {
            // The state was changed
            this.log.silly(`state ${id} changed: ${state.val} (ack = ${state.ack})`);
            if (!id) {
                return;
            }
            let payload = PlenticoreData.prepareWriteValue(id, state);
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
        if (!this.#plenticoreAPI.loggedIn) {
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

            this.setState('info.connection', true, true);

            try {
                // init processdata
                let allProcessData = await this.#plenticoreAPI.getAllProcessData();
                let optionalProcessData;
                try {
                    optionalProcessData = JSON.parse(this.config.pdoptionals);
                } catch (e) {
                    optionalProcessData = [];
                }
                this.#processdata.setAllIDs(allProcessData);
                this.#processdata.init(optionalProcessData);

                // init settings
                let allSettings = await this.#plenticoreAPI.getAllSettings();
                let optionalSettings;
                try {
                    optionalSettings = JSON.parse(this.config.pdoptionals);
                } catch (e) {
                    optionalSettings = [];
                }
                this.#settings.setAllIDs(allSettings);
                this.#settings.init(optionalSettings);

                // subscribe to all settings that are writable
                this.subscribeStates('settings.*');
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

        // timer for next interval
        this.nextLoop();
    }

    nextLoop() {
        this.#mainlooptimer = setTimeout(
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
     * @param {Partial<utils.AdapterOptions>} [options]
     */
    module.exports = options => new PlenticoreG3(options);
} else {
    // otherwise start the instance directly
    new PlenticoreG3();
}
