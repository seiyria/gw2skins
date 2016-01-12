
import React from 'react';
import HeaderBar from '../components/headerbar';
import KeyEntry from '../components/keyentry';
import Results from '../components/results';

export default class Page extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      showResults: !!window.localStorage.itemData,
      results: window.localStorage.itemData ? JSON.parse(window.localStorage.itemData) : []
    };

    this._doSearch = this._doSearch.bind(this);
  }

  _doSearch(results) {
    this.state.showResults = true;
    this.state.results = results;
    this.forceUpdate();
  }

  render() {
    return (
      <div>
        <HeaderBar />
        <div className="container">
          <div className="text-center margin-top-10">made with &hearts; by seiyria.4792</div>
          <KeyEntry onSearch={this._doSearch} />
          { this.state.showResults &&
            <Results items={this.state.results} />
          }
        </div>
      </div>
    );
  }
}