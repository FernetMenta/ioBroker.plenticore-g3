import React, { Component } from 'react';
import PropTypes from 'prop-types';

import {
    TextField,
    Select,
    InputLabel,
    MenuItem,
    FormControl,
    IconButton,
    InputAdornment,
    Input,
    FormControlLabel,
    Checkbox,
} from '@mui/material';

import { Visibility, VisibilityOff } from '@mui/icons-material';
import { I18n, Logo } from '@iobroker/adapter-react-v5';

const styles = {
    tab: {
        width: '100%',
        minHeight: '100%',
    },
    input: {
        minWidth: 400,
        marginRight: 2,
        marginBottom: 2,
    },
    column: {
        display: 'inline-block',
        verticalAlign: 'top',
        marginRight: 20,
    },
    columnSettings: {
        width: 'calc(100% - 10px)',
    },
};

/**
 * Class for handling basic settings like connection parameters
 */
class Options extends Component {
    /**
     * @param {object} props - properties set when the component gets created
     */
    constructor(props) {
        super(props);

        let expanded = window.localStorage.getItem('plenticore.connection.expanded') || '[]';
        try {
            expanded = JSON.parse(expanded);
        } catch (e) {
            expanded = [];
            console.log(e);
        }

        this.state = {
            inAction: false,
            toast: '',
            isInstanceAlive: false,
            errorWithPercent: false,
            expanded,
            showPassword: false,
        };

        this.aliveId = `system.adapter.${this.props.adapterName}.${this.props.instance}.alive`;
    }

    /**
     * Called by React when component was mounted
     */
    componentDidMount() {
        this.props.socket.getState(this.aliveId).then(state => {
            this.setState({ isInstanceAlive: state && state.val });
            this.props.socket.subscribeState(this.aliveId, this.onAliveChanged);
        });
    }

    /**
     * Called by React before component will unmount.
     */
    componentWillUnmount() {
        this.props.socket.unsubscribeState(this.aliveId, this.onAliveChanged);
    }

    onAliveChanged = (id, state) => {
        if (id === this.aliveId) {
            this.setState({ isInstanceAlive: state && state.val });
        }
    };

    /**
     * Toggle show/hide password
     */
    handleClickShowPassword() {
        let newState = !this.state.showPassword;
        this.setState({ showPassword: newState });
    }

    /**
     * Toggle show/hide password
     */
    handleMouseDownPassword() {
        let newState = !this.state.showPassword;
        this.setState({ showPassword: newState });
    }

    /**
     * Renders the component
     */
    render() {
        const narrowWidth = this.props.width === 'xs' || this.props.width === 'sm' || this.props.width === 'md';
        return (
            <form style={{ ...styles.tab }}>
                <Logo
                    instance={this.props.instance}
                    common={this.props.common}
                    native={this.props.native}
                    onError={text => this.setState({ errorText: text })}
                    onLoad={this.props.onLoad}
                />
                <div style={{ ...styles.column, ...styles.columnSettings }}>
                    <TextField
                        style={{ ...styles.input }}
                        variant="standard"
                        label={I18n.t('Hostname or IP')}
                        value={this.props.native.host}
                        type="text"
                        onChange={e => this.props.onChange('host', e.target.value)}
                        margin="normal"
                    />
                    <br />
                    <TextField
                        style={{ ...styles.input }}
                        variant="standard"
                        label={'Port'}
                        value={this.props.native.port}
                        type="text"
                        onChange={e => this.props.onChange('port', e.target.value)}
                        margin="normal"
                    />
                    {narrowWidth && <br />}
                    <FormControlLabel
                        control={
                            <Checkbox
                                checked={this.props.native.https === undefined ? true : this.props.native.https}
                                onChange={e => this.props.onChange('https', e.target.checked)}
                            />
                        }
                        label={I18n.t('Use HTTPS')}
                    />
                    <br />
                    <FormControl
                        variant="standard"
                        style={{ ...styles.input }}
                        margin="normal"
                    >
                        <InputLabel htmlFor="standard-adornment-password">{I18n.t('Password')}</InputLabel>
                        <Input
                            id="standard-adornment-password"
                            type={this.state.showPassword ? 'text' : 'password'}
                            value={this.props.native.password}
                            onChange={e => this.props.onChange('password', e.target.value)}
                            endAdornment={
                                <InputAdornment position="end">
                                    <IconButton
                                        aria-label={
                                            this.state.showPassword ? 'hide the password' : 'display the password'
                                        }
                                        onClick={() => this.handleClickShowPassword()}
                                        onMouseDown={() => this.handleMouseDownPassword()}
                                    >
                                        {this.state.showPassword ? <VisibilityOff /> : <Visibility />}
                                    </IconButton>
                                </InputAdornment>
                            }
                        />
                    </FormControl>
                    <br />
                    <TextField
                        style={{ ...styles.input }}
                        variant="standard"
                        label={I18n.t('Polling Interval')}
                        value={this.props.native.pollinginterval}
                        type="number"
                        slotProps={{
                            htmlInput: {
                                max: 60,
                                min: 5,
                            },
                        }}
                        onChange={e => this.props.onChange('pollinginterval', e.target.value)}
                        margin="normal"
                    />
                    <br />
                    <FormControl
                        variant="standard"
                        style={{ ...styles.input }}
                    >
                        <InputLabel>{I18n.t('Language')}</InputLabel>
                        <Select
                            variant="standard"
                            value={this.props.native.language || 'system'}
                            onChange={e =>
                                this.props.onChange('language', e.target.value === 'system' ? '' : e.target.value)
                            }
                        >
                            <MenuItem value="system">{I18n.t('System language')}</MenuItem>
                            <MenuItem value="en">English</MenuItem>
                            <MenuItem value="de">Deutsch</MenuItem>
                            <MenuItem value="ru">русский</MenuItem>
                            <MenuItem value="pt">Portugues</MenuItem>
                            <MenuItem value="nl">Nederlands</MenuItem>
                            <MenuItem value="fr">français</MenuItem>
                            <MenuItem value="it">Italiano</MenuItem>
                            <MenuItem value="es">Espanol</MenuItem>
                            <MenuItem value="pl">Polski</MenuItem>
                            <MenuItem value="zh-cn">简体中文</MenuItem>
                        </Select>
                    </FormControl>
                </div>
            </form>
        );
    }
}

Options.propTypes = {
    common: PropTypes.object.isRequired,
    native: PropTypes.object.isRequired,
    instance: PropTypes.number.isRequired,
    adapterName: PropTypes.string.isRequired,
    onError: PropTypes.func,
    onLoad: PropTypes.func,
    onChange: PropTypes.func,
    changed: PropTypes.bool,
    socket: PropTypes.object.isRequired,
};

export default Options;
