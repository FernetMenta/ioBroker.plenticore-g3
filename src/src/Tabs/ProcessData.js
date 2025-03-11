import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { darken, lighten, styled } from '@mui/material/styles';

import { Box } from '@mui/material';

import { DataGrid } from '@mui/x-data-grid';
import { Logo } from '@iobroker/adapter-react-v5';

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

class Optionals extends Component {
    constructor(props) {
        super(props);

        this.state = {
            inAction: false,
            toast: '',
            isInstanceAlive: false,
            errorWithPercent: false,
            processdata: [],
            rowSelectionModel: [],
        };

        this.aliveId = `system.adapter.${this.props.adapterName}.${this.props.instance}.alive`;
        this.processdataid = `${this.props.adapterName}.${this.props.instance}.processdata`;

        this.columns = [
            { field: 'id', headerName: 'ID', minWidth: 200, editable: false, flex: 1 },
            {
                field: 'description',
                headerName: 'Description',
                minWidth: 150,
                editable: true,
                flex: 1,
            },
        ];
    }

    updatePDWithOptionals(pcocessdata) {
        let newRowSelectionModel = [];
        let optionals = [];
        try {
            optionals = JSON.parse(this.props.native.pdoptionals);
        } catch (e) {
            console.log(e);
        }
        console.log(optionals);
        for (const option of optionals) {
            let found = pcocessdata.find(elem => elem.id === option.id);
            if (found) {
                found.description = option.description;
                newRowSelectionModel.push(found.id);
                console.log(found);
            }
        }
        this.setState({ rowSelectionModel: newRowSelectionModel });
    }

    readStatus(cb) {
        this.props.socket.getState(this.aliveId).then(aliveState =>
            this.props.socket.getState(this.processdataid).then(state => {
                let processdata;
                try {
                    processdata = state && state.val ? JSON.parse(state.val) : [];
                    console.log(processdata);
                    this.updatePDWithOptionals(processdata);
                } catch (e) {
                    console.log(e);
                    processdata = [];
                }

                this.setState({ isInstanceAlive: aliveState && aliveState.val, processdata }, () => cb && cb());
            }),
        );
    }

    componentDidMount() {
        this.props.socket.getState(this.aliveId).then(state => {
            this.setState({ isInstanceAlive: state && state.val });
            this.readStatus(() => {
                this.props.socket.subscribeState(this.aliveId, this.onAliveChanged);
                this.props.socket.subscribeState(this.processdataid, this.onStateChanged);
            });
        });
    }

    componentWillUnmount() {
        this.props.socket.unsubscribeState(this.aliveId, this.onAliveChanged);
        this.props.socket.unsubscribeState(this.processdataid, this.onStateChanged);
    }

    onAliveChanged = (id, state) => {
        if (id === this.aliveId) {
            this.setState({ isInstanceAlive: state && state.val });
        }
    };

    onStateChanged = (id, state) => {
        if (id === this.processdataid) {
            let processdata;
            try {
                processdata = state && state.val ? JSON.parse(state.val) : [];
                this.updatePDWithOptionals(processdata);
            } catch (e) {
                console.log(e);
                processdata = [];
            }
            this.setState({ processdata });
        }
    };

    onRowSelectionModelChange = newRowSelectionModel => {
        this.setState({ rowSelectionModel: newRowSelectionModel });
        let optionals = [];
        for (const id of newRowSelectionModel) {
            let found = this.state.processdata.find(elem => elem.id === id);
            if (found) {
                optionals.push(found);
            }
        }
        this.props.onChange('pdoptionals', JSON.stringify(optionals));
    };

    onProcessUpdateRow = updatedRow => {
        console.log(this.state.rowSelectionModel);
        let isSelected = this.state.rowSelectionModel.includes(updatedRow.id);
        if (isSelected) {
            let optionals = [];
            try {
                optionals = JSON.parse(this.props.native.pdoptionals);
            } catch (e) {
                console.log(e);
            }
            let found = optionals.find(elem => elem.id === updatedRow.id);
            if (found) {
                found.description = updatedRow.description;
            }
            this.props.onChange('pdoptionals', JSON.stringify(optionals));
        }
        return updatedRow;
    };

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
                        rows={this.state.processdata}
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
};

export default Optionals;
