import React, { Component } from 'react';
import { withStyles } from '@mui/styles';
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
  Checkbox
} from '@mui/material';

import { Visibility, VisibilityOff } from '@mui/icons-material';
import { I18n, Logo } from '@iobroker/adapter-react-v5';

const styles = theme => ({
  tab: {
    width: '100%',
    minHeight: '100%',
  },
  input: {
    minWidth: 300,
    marginRight: theme.spacing(2),
    marginBottom: theme.spacing(2),
  },
  inputNarrowText: {
    minWidth: 300,
    marginRight: theme.spacing(2),
    marginTop: 6,
  },
  buttonDelete: {
    marginTop: 14,
  },
  inputNarrowColor: {
    minWidth: 300,
    marginRight: theme.spacing(2),
    marginTop: 0,
  },
  inputMessengers: {
    minWidth: 200,
    marginRight: theme.spacing(2),
    marginBottom: theme.spacing(2),
  },
  button: {
    marginRight: 20,
    marginBottom: 40,
  },
  card: {
    maxWidth: 345,
    textAlign: 'center',
  },
  media: {
    height: 180,
  },
  column: {
    display: 'inline-block',
    verticalAlign: 'top',
    marginRight: 20,
  },
  columnLogo: {
    width: 350,
    marginRight: 0,
  },
  columnSettings: {
    width: 'calc(100% - 10px)',
  },
  cannotUse: {
    color: 'red',
    fontWeight: 'bold',
  },
  hintUnsaved: {
    fontSize: 12,
    color: 'red',
    fontStyle: 'italic',
  },
  buttonFormat: {
    marginTop: 20,
  },
  checkBoxLabel: {
    whiteSpace: 'nowrap',
  },
  heading: {
    fontWeight: 'bold',
  },
});

class Options extends Component {
  constructor (props) {
    super(props);

    let expanded = window.localStorage.getItem('plenticore.connection.expanded') || '[]';
    try {
      expanded = JSON.parse(expanded);
    } catch (e) {
      expanded = [];
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

    this.props.socket
      .getState(this.aliveId)
      .then(state => this.setState({ isInstanceAlive: state && state.val }));
  }

  componentDidMount () {
    this.props.socket.subscribeState(this.aliveId, this.onAliveChanged);
  }

  componentWillUnmount () {
    this.props.socket.unsubscribeState(this.aliveId, this.onAliveChanged);
  }

  onAliveChanged = (id, state) => {
    if (id === this.aliveId) {
      this.setState({ isInstanceAlive: state && state.val });
    }
  };

  onToggle (id) {
    const expanded = [...this.state.expanded];
    const pos = expanded.indexOf(id);
    if (pos !== -1) {
      expanded.splice(pos, 1);
    } else {
      expanded.push(id);
      expanded.sort();
    }
    window.localStorage.setItem('plenticore.connection.expanded', JSON.stringify(expanded));
    this.setState({ expanded });
  }

  handleClickShowPassword () {
    let newState = !(this.state.showPassword);
    this.setState({showPassword: newState});
  }

  handleMouseDownPassword () {
    let newState = !(this.state.showPassword);
    this.setState({showPassword: newState});
  }

  render () {
    const narrowWidth = this.props.width === 'xs' || this.props.width === 'sm' || this.props.width === 'md';
    return (
      <form className={this.props.classes.tab}>
        <Logo
          instance={this.props.instance}
          common={this.props.common}
          native={this.props.native}
          onError={text => this.setState({ errorText: text })}
          onLoad={this.props.onLoad}
        />
        <div className={`${this.props.classes.column} ${this.props.classes.columnSettings}`}>
          <TextField
            variant='standard'
            label={I18n.t('Hostname or IP')}
            className={this.props.classes.input}
            value={this.props.native.host}
            type='text'
            onChange={e => this.props.onChange('host', e.target.value)}
            margin='normal'
          />
          <br />
          <TextField
            variant='standard'
            label={I18n.t('Port')}
            className={this.props.classes.input}
            value={this.props.native.port}
            type='text'
            onChange={e => this.props.onChange('port', e.target.value)}
            margin='normal'
          />
          {narrowWidth && <br />}
          <FormControlLabel
            classes={{ label: this.props.classes.checkBoxLabel }}
            control={<Checkbox checked={this.props.native.https === undefined ? true : this.props.native.https} onChange={e => this.props.onChange('https', e.target.checked)} />}
            label={I18n.t('Use HTTPS')}
          />
          <br />
          <FormControl variant='standard' className={this.props.classes.input} margin='normal'>
            <InputLabel htmlFor='standard-adornment-password'>{I18n.t('Password')}</InputLabel>
            <Input
              id='standard-adornment-password'
              type={this.state.showPassword ? 'text' : 'password'}
              value={this.props.native.password}
              onChange={e => this.props.onChange('password', e.target.value)}
              endAdornment={
                <InputAdornment position='end'>
                  <IconButton
                    aria-label={this.state.showPassword ? 'hide the password' : 'display the password'}
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
            variant='standard'
            label={I18n.t('Polling Interval')}
            className={this.props.classes.input}
            value={this.props.native.pollinginterval}
            type="number"
            slotProps={{
              htmlInput: { 
                max: 60, 
                min: 5 
              }
            }}
            onChange={e => this.props.onChange('pollinginterval', e.target.value)}
            margin='normal'
          />
          <br />
          <FormControl variant='standard' className={this.props.classes.input}>
            <InputLabel>{I18n.t('Language')}</InputLabel>
            <Select
              variant='standard'
              value={this.props.native.language || 'system'}
              onChange={e =>
                this.props.onChange('language', e.target.value === 'system' ? '' : e.target.value)
              }
            >
              <MenuItem value='system'>{I18n.t('System language')}</MenuItem>
              <MenuItem value='en'>English</MenuItem>
              <MenuItem value='de'>Deutsch</MenuItem>
              <MenuItem value='ru'>русский</MenuItem>
              <MenuItem value='pt'>Portugues</MenuItem>
              <MenuItem value='nl'>Nederlands</MenuItem>
              <MenuItem value='fr'>français</MenuItem>
              <MenuItem value='it'>Italiano</MenuItem>
              <MenuItem value='es'>Espanol</MenuItem>
              <MenuItem value='pl'>Polski</MenuItem>
              <MenuItem value='zh-cn'>简体中文</MenuItem>
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

export default withStyles(styles)(Options);
