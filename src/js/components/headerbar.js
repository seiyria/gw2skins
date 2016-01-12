
import React from 'react';
import AppBar from 'material-ui/lib/app-bar';
import FlatButton from 'material-ui/lib/flat-button';

export default class HeaderBar extends React.Component {

  _toGithub() {
    window.open('https://github.com/seiyria/gw2skins', '_blank');
  }

  render() {
    return (
      <AppBar
        title="gw2skins"
        showMenuIconButton={false}
        iconElementRight={<FlatButton label="View on GitHub" onClick={this._toGithub} />}
        />
    );
  }
}