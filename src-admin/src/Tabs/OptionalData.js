import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { darken, lighten, styled } from '@mui/material/styles';

import { Box } from '@mui/material';

import { DataGrid } from '@mui/x-data-grid';
import { I18n, Logo } from '@iobroker/adapter-react-v5';

const getBackgroundColor = (color, theme, coefficient) => ({
    backgroundColor: darken(color, coefficient),
    ...theme.applyStyles('light', {
        backgroundColor: lighten(color, coefficient),
    }),
});

const StyledDataGrid = styled(DataGrid)(({ theme }) => ({
    '& .super-app-theme--Preselected': {
        ...getBackgroundColor(theme.palette.success.main, theme, 0.7),
        '&:hover': {
            ...getBackgroundColor(theme.palette.success.main, theme, 0.6),
        },
        '&.Mui-selected': {
            ...getBackgroundColor(theme.palette.success.main, theme, 0.5),
            '&:hover': {
                ...getBackgroundColor(theme.palette.success.main, theme, 0.4),
            },
        },
    },
    '& .super-app-theme--Options': {
        ...getBackgroundColor(theme.palette.background.default, theme, 0.7),
        '&:hover': {
            ...getBackgroundColor(theme.palette.info.main, theme, 0.6),
        },
        '&.Mui-selected': {
            ...getBackgroundColor(theme.palette.info.main, theme, 0.5),
            '&:hover': {
                ...getBackgroundColor(theme.palette.info.main, theme, 0.4),
            },
        },
    },
}));

/**
 * Class for handling optional process data and settings
 */
class Optionals extends Component {
    /**
     * @param {object} props - properties set in App.js when component is created
     */
    constructor(props) {
        super(props);

        this.state = {
            inAction: false,
            toast: '',
            isInstanceAlive: false,
            errorWithPercent: false,
            availabledata: [],
            rowSelectionModel: {
                type: 'include',
                ids: new Set(),
            },
        };

        this.aliveId = `system.adapter.${this.props.adapterName}.${this.props.instance}.alive`;
        this.allAvailableId = `${this.props.adapterName}.${this.props.instance}.${this.props.type}.all-available`;
        this.optionalsId =
            this.props.type === 'processdata' ? this.props.native.pdoptionals : this.props.native.settingoptionals;

        this.columns = [
            { field: 'id', headerName: 'ID', minWidth: 200, editable: false, flex: 1 },
            {
                field: 'description',
                headerName: I18n.t('Description'),
                minWidth: 150,
                editable: true,
                flex: 1,
            },
        ];
    }

    /**
     * Updates the arry of IDs in data with user defined optionals
     *
     * @param {Array} data - array of IDs and with descriptions
     */
    updateDataWithOptionals(data) {
        let newRowSelectionModel = {
            type: 'include',
            ids: new Set(),
        };
        let optionals = [];
        try {
            optionals = JSON.parse(this.optionalsId);
        } catch {
            // ignore;
        }
        for (const option of optionals) {
            let found = data.find(elem => elem.id === option.id);
            if (found && !found.preselected) {
                found.description = option.description;
                newRowSelectionModel.ids.add(found.id);
            }
        }
        this.setState({ rowSelectionModel: newRowSelectionModel });
    }

    static #translateDescription(table) {
        for (let row of table) {
            if (row.description) {
                row.description = row.description[I18n.getLanguage()];
            }
        }
    }

    /**
     * Reads the iobroker state with all available data
     *
     * @param {callback} cb - callback when finished
     */
    readStatus(cb) {
        this.props.socket.getState(this.aliveId).then(aliveState =>
            this.props.socket.getState(this.allAvailableId).then(state => {
                let allavailable;
                try {
                    allavailable = state && state.val ? JSON.parse(state.val) : [];
                    Optionals.#translateDescription(allavailable);
                    this.updateDataWithOptionals(allavailable);
                } catch {
                    allavailable = [];
                }

                this.setState({ isInstanceAlive: aliveState && aliveState.val, allavailable }, () => cb && cb());
            }),
        );
    }

    /**
     * Called by React when component was mounted
     */
    componentDidMount() {
        this.props.socket.getState(this.aliveId).then(state => {
            this.setState({ isInstanceAlive: state && state.val });
            this.readStatus(() => {
                this.props.socket.subscribeState(this.aliveId, this.onAliveChanged);
                this.props.socket.subscribeState(this.allAvailableId, this.onStateChanged);
            });
        });
    }

    /**
     * Called by React before component will unmount.
     */
    componentWillUnmount() {
        this.props.socket.unsubscribeState(this.aliveId, this.onAliveChanged);
        this.props.socket.unsubscribeState(this.allAvailableId, this.onStateChanged);
    }

    onAliveChanged = (id, state) => {
        if (id === this.aliveId) {
            this.setState({ isInstanceAlive: state && state.val });
        }
    };

    onStateChanged = (id, state) => {
        if (id === this.allAvailableId) {
            let allavailable;
            try {
                allavailable = state && state.val ? JSON.parse(state.val) : [];
                Optionals.#translateDescription(allavailable);
                this.updateDataWithOptionals(allavailable);
            } catch {
                allavailable = [];
            }
            this.setState({ allavailable });
        }
    };

    onRowSelectionModelChange = newRowSelectionModel => {
        this.setState({ rowSelectionModel: newRowSelectionModel });
        let optionals = [];
        for (const id of newRowSelectionModel.ids) {
            let found = this.state.allavailable.find(elem => elem.id === id);
            if (found) {
                optionals.push(found);
            }
        }
        this.props.onChange(
            this.props.type === 'processdata' ? 'pdoptionals' : 'settingoptionals',
            JSON.stringify(optionals),
        );
    };

    onProcessUpdateRow = updatedRow => {
        let isSelected = this.state.rowSelectionModel.ids.has(updatedRow.id);
        if (isSelected) {
            let optionals = [];
            try {
                optionals = JSON.parse(this.optionalsId);
            } catch {
                // ignore;
            }
            let found = optionals.find(elem => elem.id === updatedRow.id);
            if (found) {
                found.description = updatedRow.description;
            }
            this.props.onChange(
                this.props.type === 'processdata' ? 'pdoptionals' : 'settingoptionals',
                JSON.stringify(optionals),
            );
        }
        return updatedRow;
    };

    /**
     * Renders the component
     */
    render() {
        return (
            <form>
                <Logo
                    instance={this.props.instance}
                    common={this.props.common}
                    native={this.props.native}
                    onError={text => this.setState({ errorText: text })}
                    onLoad={this.props.onLoad}
                />
                <Box sx={{ height: '100%', width: '100%', pb: 10 }}>
                    <StyledDataGrid
                        rows={this.state.allavailable}
                        columns={this.columns}
                        checkboxSelection
                        disableRowSelectionOnClick
                        rowHeight={30}
                        isRowSelectable={params => params.row.preselected === false}
                        isCellEditable={params => params.row.preselected === false}
                        getRowClassName={params =>
                            params.row.preselected ? 'super-app-theme--Preselected' : 'super-app-theme--Options'
                        }
                        processRowUpdate={(updatedRow, originalRow) => this.onProcessUpdateRow(updatedRow, originalRow)}
                        rowSelectionModel={this.state.rowSelectionModel}
                        onRowSelectionModelChange={newRowSelectionModel =>
                            this.onRowSelectionModelChange(newRowSelectionModel)
                        }
                    />
                </Box>
            </form>
        );
    }
}

Optionals.propTypes = {
    common: PropTypes.object.isRequired,
    native: PropTypes.object.isRequired,
    instance: PropTypes.number.isRequired,
    adapterName: PropTypes.string.isRequired,
    onError: PropTypes.func,
    onLoad: PropTypes.func,
    onChange: PropTypes.func,
    socket: PropTypes.object.isRequired,
    type: PropTypes.object.isRequired,
};

export default Optionals;
