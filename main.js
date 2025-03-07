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
const ProcessData = require('./lib/processdata.js');

class PlenticoreG3 extends utils.Adapter {
  #plenticoreAPI;
  #processdata;
  #mainlooptimer;
  /**
   * @param {Partial<utils.AdapterOptions>} [options={}]
   */
  constructor (options) {
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
  async onReady () {
    console.log('------------ ready');
    // Initialize your adapter here
    if (this.config.language != "") {
      console.log("init to: " + this.config.language);
      await I18n.init(path.join(__dirname, 'lib'), this.config.language);
    } else {
      await I18n.init(path.join(__dirname, 'lib'), this);
    }
    
    console.log(I18n.translate("Grid_P"));


    // Reset the connection indicator during startup
    this.setState('info.connection', false, true);

    // The adapters config (in the instance object everything under the attribute "native") is accessible via
    // this.config:
    console.log(this.config);

    /*
        For every state in the system there has to be also an object of type state
        Here a simple template for a boolean variable named "testVariable"
        Because every adapter instance uses its own unique namespace variable names can't collide with other adapters variables
        */
    await this.setObjectNotExistsAsync('testVariable', {
      type: 'state',
      common: {
        name: 'testVariable1',
        type: 'string',
        role: 'indicator',
        read: true,
        write: true,
      },
      native: {},
    });

    // In order to get state updates, you need to subscribe to them. The following line adds a subscription for our variable we have created above.
    this.subscribeStates('testVariable');
    // You can also add a subscription for multiple states. The following line watches all states starting with "lights."
    // this.subscribeStates("lights.*");
    // Or, if you really must, you can also watch all states. Don't do this if you don't need to. Otherwise this will cause a lot of unnecessary load on the system:
    // this.subscribeStates("*");

    /*
            setState examples
            you will notice that each setState will cause the stateChange event to fire (because of above subscribeStates cmd)
        */
    // the variable testVariable is set to true as command (ack=false)
    //await this.setStateAsync("testVariable", true);

    this.#processdata = new ProcessData(this, I18n);
  //  console.log(this.#processdata.printData());

    this.#plenticoreAPI = new PlenticoreAPI(
      this.config.host,
      this.config.port,
      this.config.https,
      this.config.password,
      this.log
    );
    this.mainloop();
  }

  /**
   * Is called when adapter shuts down - callback has to be called under any circumstances!
   * @param {() => void} callback
   */
  onUnload (callback) {
    try {
      // Here you must clear all timeouts or intervals that may still be active
      clearTimeout(this.#mainlooptimer);
      this.#plenticoreAPI = null;
      this.setState('info.connection', false, true);

      callback();
    } catch (e) {
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
   * @param {string} id
   * @param {ioBroker.State | null | undefined} state
   */
  onStateChange (id, state) {
    if (state) {
      // The state was changed
      this.log.info(`state ${id} changed: ${state.val} (ack = ${state.ack})`);
    } else {
      // The state was deleted
      this.log.info(`state ${id} deleted`);
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
  async mainloop () {
    if (!this.#plenticoreAPI.loggedIn) {
      try {
        await this.#plenticoreAPI.login();
      } catch(e) {
        if (e == 'auth') {
          // stop loop due to authorization issue
          this.terminate();
        } else {
          this.nextLoop();
          return;
        }
      }

      this.setState('info.connection', true, true);

      try {
        let allProcessData = await this.#plenticoreAPI.getAllProcessData();
        // console.log("----------------------------");
        // console.log(allProcessData);
        // console.log("----------------------------");
        this.#processdata.setAllIDs(allProcessData);
        this.#processdata.init();
      } catch(e) {
        if (e == 'auth') {
          // stop loop due to authorization issue
          this.terminate();
        } else {
          this.nextLoop();
          return;
        }
      }
    }

    // poll process data
    let pdPollIDs = this.#processdata.getPollIDs();
    try {
      let processData = await this.#plenticoreAPI.getProcessData(pdPollIDs);
      await this.#processdata.processData(processData);
    } catch(e) {
      if (e == 'auth') {
        // stop loop due to authorization issue
        this.terminate();
      } else {
        this.nextLoop();
        return;
      }
    }

    // timer for next interval
    this.nextLoop();
  }

  nextLoop () {
    this.#mainlooptimer = setTimeout(() => {
      this.mainloop();
    }, parseInt(this.config.pollinginterval) * 1000);
  }
}

if (require.main !== module) {
  // Export the constructor in compact mode
  /**
   * @param {Partial<utils.AdapterOptions>} [options={}]
   */
  module.exports = options => new PlenticoreG3(options);
} else {
  // otherwise start the instance directly
  new PlenticoreG3();
}
