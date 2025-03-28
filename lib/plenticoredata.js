//-----------------------------------------------------------------------------
// preset processdata IDs
//-----------------------------------------------------------------------------
const presetProcessDataIDs = [
    { id: 'devices:local/Grid_P', description: 'Grid_P' },
    { id: 'devices:local/Dc_P', description: 'Dc_P' },
    { id: 'devices:local/Home_P', description: 'Home_P' },
    { id: 'devices:local:ac/P', description: 'ac/P' },
    { id: 'devices:local:battery/P', description: 'battery/P' },
    { id: 'devices:local:battery/SoC', description: 'battery/SoC' },
    { id: 'scb:statistic:EnergyFlow/Statistic:Yield:Day', description: 'Statistic:Yield:Day' },
    { id: 'scb:statistic:EnergyFlow/Statistic:EnergyChargePv:Day', description: 'Statistic:EnergyChargePv:Day' },
    { id: 'scb:statistic:EnergyFlow/Statistic:EnergyHome:Day', description: 'Statistic:EnergyHome:Day' },
    { id: 'scb:statistic:EnergyFlow/Statistic:EnergyHomeBat:Day', description: 'Statistic:EnergyHomeBat:Day' },
    { id: 'scb:statistic:EnergyFlow/Statistic:EnergyHomeGrid:Day', description: 'Statistic:EnergyHomeGrid:Day' },
    { id: 'scb:statistic:EnergyFlow/Statistic:EnergyHomePv:Day', description: 'Statistic:EnergyHomePv:Day' },
];

//-----------------------------------------------------------------------------
// preset setting IDs
//-----------------------------------------------------------------------------
const presetSettingIDs = [
    { id: 'devices:local/Battery:MinHomeComsumption', description: 'Battery:MinHomeComsumption' },
    { id: 'devices:local/Battery:MinSoc', description: 'Battery:MinSoc' },
];

const EntryID = {
    id: '',
    description: '',
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
            if (value.type == 'channel') {
                let topChannel = value.native.type;
                let moduleId = value.native.moduleid;
                if (!topChannel || !moduleId) {
                    continue;
                }
                if (topChannel == this.#type) {
                    let found = this.#presetIDs.find(elem => elem.id.startsWith(moduleId));
                    if (!found) {
                        found = this.#optionalIDs.find(elem => elem.id.startsWith(moduleId));
                    }
                    if (!found) {
                        await this.#adapter.delObjectAsync(key);
                        this.#adapter.log.info(`deleted unsued channel ${key}`);
                    }
                }
            }
        }
    }

    async #createObjects(values) {
        for (const module of values) {
            // create channel
            let channelname = `${this.#type}.`;
            channelname += module.moduleid.replaceAll(':', '.');
            await this.#adapter.setObject(channelname, {
                type: 'channel',
                common: {
                    name: '',
                },
                native: {
                    type: this.#type,
                    moduleid: module.moduleid,
                },
            });
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
                let id = value.id.replaceAll(':', '_');
                if (this.#type == 'processdata') {
                    await this.#adapter.setObject(`${channelname}.${id}`, {
                        type: 'state',
                        common: {
                            name: id.replace('Statistic_', ''),
                            desc: description,
                            type: 'number',
                            role: 'value',
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
                    await this.#adapter.setObject(`${channelname}.${id}`, {
                        type: 'state',
                        common: {
                            name: id,
                            desc: description,
                            type: settingtype,
                            role: 'value',
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
            }
        }

        // update state that hold the array (used by admin)
        this.#adapter.setState(`${this.#type}-available`, JSON.stringify(this.#allIDs), true);

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
            let channelname = `${this.#type}.`;
            channelname += module.moduleid.replaceAll(':', '.');
            for (const value of module[this.#type]) {
                let id = value.id.replaceAll(':', '_');
                if (this.#type == 'processdata') {
                    this.#adapter.setState(`${channelname}.${id}`, value.value, true);
                } else {
                    let obj = await this.#adapter.getObjectAsync(`${channelname}.${id}`);
                    let type = obj.common.type;
                    let val = type == 'string' ? value.value : Number(value.value);
                    this.#adapter.setState(`${channelname}.${id}`, val, true);
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
