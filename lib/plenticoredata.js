//-----------------------------------------------------------------------------
// preset processdata IDs
//-----------------------------------------------------------------------------
const presetProcessDataIDs = [
    { id: 'devices:local/Grid_P', description: 'Grid_P', role: 'value.power' },
    { id: 'devices:local/Dc_P', description: 'Dc_P', role: 'value.power' },
    { id: 'devices:local/Home_P', description: 'Home_P', role: 'value.power' },
    { id: 'devices:local:ac/P', description: 'ac/P', role: 'value.power' },
    { id: 'devices:local:battery/P', description: 'battery/P', role: 'value.power' },
    { id: 'devices:local:battery/SoC', description: 'battery/SoC' },
    { id: 'scb:statistic:EnergyFlow/Statistic:Yield:Day', description: 'Statistic:Yield:Day', role: 'value.energy' },
    {
        id: 'scb:statistic:EnergyFlow/Statistic:EnergyChargePv:Day',
        description: 'Statistic:EnergyChargePv:Day',
        role: 'value.energy',
    },
    {
        id: 'scb:statistic:EnergyFlow/Statistic:EnergyHome:Day',
        description: 'Statistic:EnergyHome:Day',
        role: 'value.energy',
    },
    {
        id: 'scb:statistic:EnergyFlow/Statistic:EnergyHomeBat:Day',
        description: 'Statistic:EnergyHomeBat:Day',
        role: 'value.energy',
    },
    {
        id: 'scb:statistic:EnergyFlow/Statistic:EnergyHomeGrid:Day',
        description: 'Statistic:EnergyHomeGrid:Day',
        role: 'value.energy',
    },
    {
        id: 'scb:statistic:EnergyFlow/Statistic:EnergyHomePv:Day',
        description: 'Statistic:EnergyHomePv:Day',
        role: 'value.energy',
    },
    { id: 'scb:update/Update:Version', description: 'Update:Version', role: 'value' },
];

//-----------------------------------------------------------------------------
// preset setting IDs
//-----------------------------------------------------------------------------
const presetSettingIDs = [
    { id: 'devices:local/Battery:MinHomeComsumption', description: 'Battery:MinHomeComsumption', role: 'level' },
    { id: 'devices:local/Battery:MinSoc', description: 'Battery:MinSoc', role: 'level.battery' },
    { id: 'scb:update/Update:Method', description: 'Update:Method', role: 'state' },
];

const EntryID = {
    id: '',
    description: '',
    role: '',
    preselected: false,
    unit: '',
    type: '',
    min: 0,
    max: 0,
};

const EntryPollPd = {
    moduleid: '',
    processdataids: {},
};

const EntryPollSetting = {
    moduleid: '',
    settingids: {},
};

//-----------------------------------------------------------------------------

/**
 * Class handles process data and settings
 */
class PlenticoreData {
    #adapter;
    #I18n;
    #type = '';
    #presetIDs = [];
    #allIDsRaw;
    #allIDs = []; // all available IDs <moduelsid>/<id>
    #pollIDs = []; // array for api call
    #optionalIDs = [];
    #isCreateObjects = true;

    /**
     * @param {object} adapter - adapter object
     * @param {object} I18n - used for translations
     * @param {string} type - to determine drocessdata and settings
     */
    constructor(adapter, I18n, type) {
        this.#adapter = adapter;
        this.#I18n = I18n;
        this.#type = type;
        if (type == 'processdata') {
            this.#presetIDs = presetProcessDataIDs;
        } else {
            this.#presetIDs = presetSettingIDs;
        }
    }

    // private methods

    #createPollIDs() {
        this.#pollIDs = [];
        for (const preset of this.#presetIDs) {
            let foundInAllIDs = this.#allIDs.find(element => element.id == preset.id);
            let key = this.#type == 'processdata' ? 'processdataids' : 'settingids';
            if (foundInAllIDs) {
                let moduleId = preset.id.substring(0, preset.id.indexOf('/'));
                let foundInPoll = this.#pollIDs.find(element => element.moduleid == moduleId);
                if (foundInPoll) {
                    let key = this.#type == 'processdata' ? 'processdataids' : 'settingids';
                    foundInPoll[key].push(preset.id.substring(preset.id.indexOf('/') + 1));
                } else {
                    let entry = this.#type == 'processdata' ? { ...EntryPollPd } : { ...EntryPollSetting };
                    let ids = [preset.id.substring(preset.id.indexOf('/') + 1)];
                    entry['moduleid'] = moduleId;
                    entry[key] = ids;
                    this.#pollIDs.push(entry);
                }
            } else {
                this.#adapter.log.warning(`preset not found in list: {preset.id}`);
            }
        }
        for (const optional of this.#optionalIDs) {
            let foundInAllIDs = this.#allIDs.find(element => element.id == optional.id);
            let key = this.#type == 'processdata' ? 'processdataids' : 'settingids';
            // skip optionals that have become presets
            if (foundInAllIDs && foundInAllIDs.preset) {
                continue;
            }
            if (foundInAllIDs) {
                let moduleId = optional.id.substring(0, optional.id.indexOf('/'));
                let foundInPoll = this.#pollIDs.find(element => element.moduleid == moduleId);
                if (foundInPoll) {
                    foundInPoll[key].push(optional.id.substring(optional.id.indexOf('/') + 1));
                } else {
                    let entry = this.#type == 'processdata' ? { ...EntryPollPd } : { ...EntryPollSetting };
                    let ids = [optional.id.substring(optional.id.indexOf('/') + 1)];
                    entry['moduleid'] = moduleId;
                    entry[key] = ids;
                    this.#pollIDs.push(entry);
                }
            } else {
                this.#adapter.log.warning(`optionsl not found in list: {preset.id}`);
            }
        }
    }

    async #deleteUnusedObjects(allObjects) {
        for (const [key, value] of Object.entries(allObjects)) {
            if (value.type == 'state') {
                let topChannel = value.native.type;
                let moduleId = value.native.moduleid;
                let id = value.native.dataid;
                if (!topChannel || !moduleId || !id) {
                    continue;
                }
                if (topChannel == this.#type) {
                    let found = this.#presetIDs.find(elem => elem.id == `${moduleId}/${id}`);
                    if (!found) {
                        found = this.#optionalIDs.find(elem => elem.id == `${moduleId}/${id}`);
                    }
                    if (!found) {
                        await this.#adapter.delObjectAsync(key);
                        this.#adapter.log.info(`deleted unsued object ${key}`);
                    }
                }
            }
        }
        for (const [key, value] of Object.entries(allObjects)) {
            if (value.type == 'folder') {
                let topChannel = value.native.type;
                if (topChannel && topChannel == this.#type) {
                    let subStates = await this.#adapter.getStatesAsync(`${key}.*`);
                    if (!subStates || Object.keys(subStates).length === 0) {
                        await this.#adapter.delObjectAsync(key);
                        this.#adapter.log.info(`deleted unsued folder ${key}`);
                    }
                }
            }
        }
    }

    static #name2id(name) {
        return (name || '').replace(/[^A-Za-z0-9-_]/g, '_');
    }

    static #guessRoleFromId(module, id) {
        if (id == 'P' || id.endsWith('_P')) {
            return 'value.energy';
        } else if (id == 'I' || id.endsWith('_I')) {
            return 'value.current';
        } else if (id == 'V' || id.endsWith('_V')) {
            return 'value.voltage';
        } else if (module.includes('EnergyFlow')) {
            return 'value.energy';
        }
        return 'value';
    }

    async #createObjects(values) {
        for (const module of values) {
            let folderid = this.#type;
            // create folder structure
            let moduleids = module.moduleid.split(':');
            for (const moduleid of moduleids) {
                folderid += `.${PlenticoreData.#name2id(moduleid)}`;
                await this.#adapter.setObject(folderid, {
                    type: 'folder',
                    common: {
                        name: moduleid,
                    },
                    native: {
                        type: this.#type,
                        moduleid: moduleid,
                    },
                });
            }
            // create objects
            for (const value of module[this.#type]) {
                let description = '';
                let found = this.#presetIDs.find(element => element.id == `${module.moduleid}/${value.id}`);
                if (!found) {
                    found = this.#optionalIDs.find(element => element.id == `${module.moduleid}/${value.id}`);
                }
                if (found) {
                    description = this.#I18n.translate(found.description);
                }
                let stateid = `${folderid}.${PlenticoreData.#name2id(value.id)}`;
                if (this.#type == 'processdata') {
                    let pdata = this.#allIDs.find(element => element.id == `${module.moduleid}/${value.id}`);
                    if (!pdata) {
                        this.#adapter.log.warning(`processdata not found in allIDS: ${module.moduleid}/${value.id}`);
                        continue;
                    }
                    let role =
                        pdata.role != '' ? pdata.role : PlenticoreData.#guessRoleFromId(module.moduleid, value.id);
                    await this.#adapter.setObject(stateid, {
                        type: 'state',
                        common: {
                            name: value.id.replace('Statistic_', ''),
                            desc: description,
                            type: 'number',
                            role: role,
                            unit: value.unit,
                            read: true,
                            write: false,
                        },
                        native: {
                            type: this.#type,
                            moduleid: module.moduleid,
                            dataid: value.id,
                        },
                    });
                } else {
                    let setting = this.#allIDs.find(element => element.id == `${module.moduleid}/${value.id}`);
                    if (!setting) {
                        this.#adapter.log.warning(`setting not found in allIDS: ${module.moduleid}/${value.id}`);
                        continue;
                    }
                    let settingtype = setting.type == 'string' ? 'string' : 'number';
                    let role = setting.role != '' ? setting.role : 'state';
                    await this.#adapter.setObject(stateid, {
                        type: 'state',
                        common: {
                            name: value.id,
                            desc: description,
                            type: settingtype,
                            role: role,
                            unit: setting.unit,
                            min: setting.min,
                            max: setting.max,
                            read: true,
                            write: true,
                        },
                        native: {
                            type: this.#type,
                            moduleid: module.moduleid,
                            dataid: value.id,
                        },
                    });
                }
            }
        }
        this.#isCreateObjects = false;
    }

    // public methods

    /**
     * Stores all the ID available
     *
     * @param {object} IDs - raw jason as return from API call
     */
    setAllIDs(IDs) {
        this.#allIDsRaw = IDs;
    }

    /**
     * Gets an Array with IDs to be polled
     */
    getPollIDs() {
        return this.#pollIDs;
    }

    /**
     * Initializes the instance. Creates an array with all available IDs in form of <moduleid>/<dataid>
     * and marks the preset IDs in this array
     *
     * @param {Array} optionalIDs - array with user defined optionals (from ui)
     * @param {Array} allAdapterObjs - all adapter objects
     */
    async init(optionalIDs, allAdapterObjs) {
        this.#optionalIDs = optionalIDs || [];
        this.#isCreateObjects = true;

        // create an array of entries with ID comprised of 'moduleId/dataId'
        this.#allIDs = [];
        for (const module of this.#allIDsRaw) {
            let moduleId = module['moduleid'];
            if (this.#type == 'processdata') {
                let IDs = module['processdataids'];
                for (const ID of IDs) {
                    let entry = { ...EntryID };
                    entry.id = `${moduleId}/${ID}`;
                    entry.description = '';
                    entry.preselected = false;
                    this.#allIDs.push(entry);
                }
            } else if (this.#type == 'settings') {
                let settings = module['settings'];
                for (const setting of settings) {
                    if (setting.access != 'readwrite') {
                        continue;
                    }

                    let entry = { ...EntryID };
                    entry.id = `${moduleId}/${setting.id}`;
                    entry.description = '';
                    entry.preselected = false;
                    entry.unit = setting.unit;
                    entry.type = setting.type;

                    if (setting.min == null) {
                        delete entry.min;
                    } else {
                        entry.min = Number(setting.min);
                    }
                    if (setting.max == null) {
                        delete entry.max;
                    } else {
                        entry.max = Number(setting.max);
                    }

                    this.#allIDs.push(entry);
                }
            }
        }

        // add presets
        for (const preset of this.#presetIDs) {
            let found = this.#allIDs.find(element => element.id == preset.id);
            if (found) {
                found.description = this.#I18n.translate(preset.description);
                found.preselected = true;
                found.role = preset.role;
            }
        }

        // update state that hold the array (used by admin)
        this.#adapter.setState(`${this.#type}.all-available`, JSON.stringify(this.#allIDs), true);

        this.#createPollIDs();
        await this.#deleteUnusedObjects(allAdapterObjs);
    }

    /**
     * Processes the data got from API call
     *
     * @param {Array} values - array values - see API doc
     */
    async processData(values) {
        if (this.#isCreateObjects) {
            await this.#createObjects(values);
        }

        // write values
        for (const module of values) {
            let channelname = this.#type;
            let moduleids = module.moduleid.split(':');
            for (const moduleid of moduleids) {
                channelname += `.${PlenticoreData.#name2id(moduleid)}`;
            }
            for (const value of module[this.#type]) {
                let id = `${channelname}.${PlenticoreData.#name2id(value.id)}`;
                if (this.#type == 'processdata') {
                    this.#adapter.setState(id, value.value, true);
                } else {
                    let obj = await this.#adapter.getObjectAsync(id);
                    let type = obj.common.type;
                    let val = type == 'string' ? value.value : Number(value.value);
                    this.#adapter.setState(id, val, true);
                }
            }
        }
    }

    /**
     * Prepares values before write
     *
     * @param {string} stateId - id of the iobroker state
     * @param {state} state - iobroker state
     */
    async prepareWriteValue(stateId, state) {
        let obj = await this.#adapter.getObjectAsync(stateId);
        let moduleid = obj.native.moduleid;
        let settingid = obj.native.dataid;
        let payload = [
            {
                moduleid: moduleid,
                settings: [
                    {
                        id: settingid,
                        value: `${state.val}`,
                    },
                ],
            },
        ];
        return payload;
    }
}

module.exports = PlenticoreData;
