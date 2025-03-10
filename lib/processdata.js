//-----------------------------------------------------------------------------
// preset processdata IDs
//-----------------------------------------------------------------------------
const presetIDs = [
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

const EntryID = {
    id: '',
    description: '',
    preselected: false,
};

const EntryPoll = {
    moduleid: '',
    processdataids: {},
};

//-----------------------------------------------------------------------------
// class
//-----------------------------------------------------------------------------
class ProcessData {
    #adapter;
    #I18n;
    #allIDsRaw;
    #allIDs = []; // all available IDs <moduelsid>/<id>
    #pollIDs = []; // array for api call
    #optionalIDs = [];
    #createObjects = true;

    constructor(adapter, I18n) {
        this.#adapter = adapter;
        this.#I18n = I18n;
    }

    // private methods

    #createPollIDs() {
        this.#pollIDs = [];
        for (const preset of presetIDs) {
            let foundInAllIDs = this.#allIDs.find(element => element.id == preset.id);
            if (foundInAllIDs) {
                let moduleId = preset.id.substring(0, preset.id.indexOf('/'));
                let foundInPoll = this.#pollIDs.find(element => element.moduleid == moduleId);
                if (foundInPoll) {
                    foundInPoll.processdataids.push(preset.id.substring(preset.id.indexOf('/') + 1));
                } else {
                    let entry = { ...EntryPoll };
                    let ids = [preset.id.substring(preset.id.indexOf('/') + 1)];
                    entry.moduleid = moduleId;
                    entry.processdataids = ids;
                    this.#pollIDs.push(entry);
                }
            } else {
                // log warning
            }
        }
        for (const optional of this.#optionalIDs) {
            let foundInAllIDs = this.#allIDs.find(element => element.id == optional.id);
            if (foundInAllIDs) {
                let moduleId = optional.id.substring(0, optional.id.indexOf('/'));
                let foundInPoll = this.#pollIDs.find(element => element.moduleid == moduleId);
                if (foundInPoll) {
                    foundInPoll.processdataids.push(optional.id.substring(optional.id.indexOf('/') + 1));
                } else {
                    let entry = { ...EntryPoll };
                    let ids = [optional.id.substring(optional.id.indexOf('/') + 1)];
                    entry.moduleid = moduleId;
                    entry.processdataids = ids;
                    this.#pollIDs.push(entry);
                }
            } else {
                // log warning
            }
        }
    }

    async #createPdObjects(pdValues) {
        for (const module of pdValues) {
            // create channel
            let channelname = module.moduleid.replaceAll(':', '.');
            await this.#adapter.setObject(channelname, {
                type: 'channel',
                common: {
                    name: '',
                },
                native: {},
            });
            // create objects
            for (const pdValue of module.processdata) {
                let description = '';
                let found = presetIDs.find(element => element.id == `${module.moduleid}/${pdValue.id}`);
                if (!found) {
                    found = this.#optionalIDs.find(element => element.id == `${module.moduleid}/${pdValue.id}`);
                }
                if (found) {
                    description = this.#I18n.translate(found.description);
                }
                await this.#adapter.setObject(`${channelname}.${pdValue.id}`, {
                    type: 'state',
                    common: {
                        name: pdValue.id.replace('Statistic:', ''),
                        desc: description,
                        type: 'number',
                        role: 'value',
                        unit: pdValue.unit,
                        read: true,
                        write: false,
                    },
                    native: {},
                });
            }
        }
        this.#createObjects = false;
    }

    // public methods

    setAllIDs(IDs) {
        this.#allIDsRaw = IDs;
    }

    getPollIDs() {
        return this.#pollIDs;
    }

    async init(optionalIDs) {
        this.#optionalIDs = optionalIDs || [];
        this.#createObjects = true;

        // create an array of entries with ID comprised of 'moduleId/dataId'
        this.#allIDs = [];
        for (const module of this.#allIDsRaw) {
            let moduleId = module['moduleid'];
            let IDs = module['processdataids'];
            for (const pdId of IDs) {
                let entry = { ...EntryID };
                entry.id = `${moduleId}/${pdId}`;
                entry.description = '';
                entry.preselected = false;
                this.#allIDs.push(entry);
            }
        }

        // add presets
        for (const preset of presetIDs) {
            let found = this.#allIDs.find(element => element.id == preset.id);
            if (found) {
                found.description = this.#I18n.translate(preset.description);
                found.preselected = true;
            }
        }

        // update state that hold the array (used by admin)
        this.#adapter.setState('processdata', JSON.stringify(this.#allIDs), true);

        this.#createPollIDs();
    }

    async processData(pdValues) {
        // for (const module of pdValues) {
        //   console.log("------------");
        //   console.log("moduleid: " + module.moduleid);
        //   for (const pdValue of module.processdata) {
        //     console.log(pdValue);
        //     console.log(pdValue.id);
        //     console.log(pdValue.unit);
        //     console.log(pdValue.value);
        //     console.log("------------");
        //   }
        // }
        if (this.#createObjects) {
            await this.#createPdObjects(pdValues);
        }

        // write values
        for (const module of pdValues) {
            let channelname = module.moduleid.replaceAll(':', '.');
            for (const pdValue of module.processdata) {
                this.#adapter.setState(`${channelname}.${pdValue.id}`, pdValue.value, true);
            }
        }
    }
}

module.exports = ProcessData;
