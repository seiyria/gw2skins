
import React from 'react';
import TextField from 'material-ui/lib/text-field';
import RaisedButton from 'material-ui/lib/raised-button';
import LinearProgress from 'material-ui/lib/linear-progress';

import Promise from 'bluebird';
import request from 'superagent-bluebird-promise';
import _ from 'lodash';

export default class KeyEntry extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      apiKey: window.localStorage.apiKey || '',
      errorMessage: '',
      disableSearch: false,
      searchProgress: 0,
      searchState: '',
      unlockedSkins: 0,
      totalSkins: 0,
      purchaseableSkins: 0
    };

    this._apiKeyChange = this._apiKeyChange.bind(this);
    this._setSearchProps = this._setSearchProps.bind(this);
    this._search = this._search.bind(this);
    this._getUnlockedSkins = this._getUnlockedSkins.bind(this);
    this._getAllSkins = this._getAllSkins.bind(this);
    this._getAllItems = this._getAllItems.bind(this);
    this._getAllItemData = this._getAllItemData.bind(this);
    this._getAllPrices = this._getAllPrices.bind(this);
    this._formatItemData = this._formatItemData.bind(this);
    this._finishSearch = this._finishSearch.bind(this);
  }

  _apiKeyChange() {
    this.state.apiKey = window.localStorage.apiKey = this.refs.apiKey.getValue();
  }

  _setSearchProps(props) {
    _.extend(this.state, props);
    this.forceUpdate();
  }

  _search() {
    this._getUnlockedSkins()        // query the wardrobe for all skins unlocked
      .then(this._getAllSkins)      // get all skins in the game
      .then(this._getAllItems)      // get all items in the game
      .then(this._getAllItemData)   // get all the data behind the items queried above and filter them by what skins we need
      .then(this._getAllPrices)     // get the TP price of every item we could buy to get the skins we need
      .then(this._formatItemData)   // format the item data in a digestible format for a table
      .then(this._finishSearch);    // clean up search results
  }

  _getUnlockedSkins() {
    this._setSearchProps({
      disableSearch: true,
      searchProgress: 0,
      searchState: 'Requesting wardrobe...'
    });

    return request
      .get(`https://api.guildwars2.com/v2/account/skins.json?access_token=${this.state.apiKey}`)
      .then(res => {
        this._setSearchProps({
          errorMessage: '',
          searchProgress: 100,
          unlockedSkins: res.body.length
        });

        return res.body;
      }, err => {
        this._setSearchProps({
          errorMessage: err ? 'Is your API key valid?' : '',
          disableSearch: false
        });
      });
  }

  _getAllSkins(mySkins = []) {
    this._setSearchProps({
      disableSearch: true,
      searchProgress: 0,
      searchState: 'Requesting all skins...'
    });

    return request
      .get(`https://api.guildwars2.com/v2/skins`)
      .then(res => {
        this._setSearchProps({
          errorMessage: '',
          searchProgress: 100,
          totalSkins: res.body.length
        });

        const lockedSkins = _.difference(res.body, mySkins);
        return lockedSkins;
      }, err => {
        this._setSearchProps({
          errorMessage: err ? 'Is your API key valid?' : '',
          disableSearch: false
        });
        return [];
      });
  }

  _getAllItems(lockedSkins = []) {

    this._setSearchProps({
      disableSearch: true,
      searchProgress: 0,
      searchState: 'Requesting all items...'
    });

    return new Promise(resolve => {
      request
        .get(`https://api.guildwars2.com/v2/items`)
        .then(res => {
          this._setSearchProps({
            searchProgress: 100
          });
          resolve({ allItems: res.body, lockedSkins });
        });
    });
  }

  _getAllItemData(itemAndSkinData = { allItems: [], lockedSkins: [] }) {
    const { allItems, lockedSkins } = itemAndSkinData;
    const pages = ~~(allItems.length/200);

    this._setSearchProps({
      disableSearch: true,
      searchProgress: 0,
      searchState: 'Requesting all item data...'
    });

    const chunks = _.chunk(allItems, 200);

    const promises = _.map(new Array(pages), (page, idx) => {

      const chunkIdStr = chunks[idx].join(',');

      return new Promise(resolve => {
        request
          .get(`https://api.guildwars2.com/v2/items?ids=${chunkIdStr}`)
          .then(res => {
            this._setSearchProps({
              searchProgress: this.state.searchProgress + (100/pages)
            });

            const lockedSkinItems = _.filter(res.body, item => item.default_skin && _.contains(lockedSkins, item.default_skin));
            resolve(lockedSkinItems);
          });
      });
    });

    return Promise.all(promises).then(vals => {
      return _.flatten(vals);
    }, err => {
      console.log(err);
      return [];
    });

  }

  _getAllPrices(items = []) {

    const buyableItems = _.reject(items, item => _.contains(item.flags, 'AccountBound') || _.contains(item.flags, 'SoulbindOnAcquire'));

    const pages = ~~(buyableItems.length/200);

    this._setSearchProps({
      disableSearch: true,
      searchProgress: 0,
      searchState: 'Requesting TP prices...'
    });

    const chunks = _.chunk(buyableItems, 200);

    const promises = _.map(new Array(pages), (page, idx) => {

      const chunkIdStr = _.pluck(chunks[idx], 'id').join(',');

      return new Promise(resolve => {
        request
          .get(`https://api.guildwars2.com/v2/commerce/prices?ids=${chunkIdStr}`)
          .then(res => {
            this._setSearchProps({
              searchProgress: this.state.searchProgress + (100/pages)
            });
            resolve(res.body);
          });
      });
    });

    return Promise.all(promises).then(vals => {
      return { items, tpPrices: _.flatten(vals) };
    }, err => {
      console.log(err);
      return { items, tpPrices: [] };
    });
  }

  _formatItemData(itemsAndPrices = { items: [], tpPrices: [] }) {
    this._setSearchProps({
      disableSearch: true,
      searchProgress: 0,
      searchState: 'Formatting item data...'
    });

    const { items, tpPrices } = itemsAndPrices;

    const skinCache = {};
    _.each(items, item => {
      if(!item.default_skin || skinCache[item.default_skin]) return;

      let matchingItems = [];

      const cheapestItem = _(items)
        .filter(checkItem => checkItem.default_skin === item.default_skin)                              // find all items where the skin matches the one we're looking at
        .tap(items => matchingItems = items)                                                            // assign matchingItems for the UI
        .each(matchItem => matchItem.priceData = _.findWhere(tpPrices, { id: matchItem.id }))           // find the items value in the trading post costs
        .filter(matchingItem => matchingItem.priceData && matchingItem.priceData.sells.unit_price > 0)  // filter by any item that has price data and where it actually is available on the trading post
        .min(matchItem => matchItem.priceData.sells.unit_price || 0);                                   // then find the cheapest item on the trading post

      skinCache[item.default_skin] = cheapestItem;
      this._setSearchProps({
        searchProgress: this.state.searchProgress + (100*matchingItems.length/items.length)
      });
    });

    const purchaseableSkins = _.filter(_.values(skinCache), _.isObject);
    this.state.purchaseableSkins = purchaseableSkins.length;

    return purchaseableSkins;
  }

  _finishSearch(formattedItemData = []) {
    this._setSearchProps({
      disableSearch: false
    });

    window.localStorage.itemData = JSON.stringify(formattedItemData);
    this.props.onSearch(formattedItemData);
  }

  render() {
    return (
      <div className="text-center margin-top-5">
        <div className="width-80 inline-block">
          <div>
            <TextField hintText="Enter your API Key (needs 'unlocks' permission)"
                       defaultValue={this.state.apiKey || ''}
                       errorText={this.state.errorMessage}
                       floatingLabelText="API Key"
                       fullWidth={true}
                       onChange={this._apiKeyChange}
                       ref="apiKey" />
          </div>
          <div className="margin-top-10">
            {
              this.state.disableSearch &&
              <LinearProgress mode='determinate' value={this.state.searchProgress} />
            }
          </div>
          <div className="margin-top-10">
            {
              this.state.unlockedSkins > 0 &&
              <span>Unlocked skins: {this.state.unlockedSkins}</span>
            }

            {
              this.state.totalSkins > 0 &&
              <span className="margin-left-10">Total skins: {this.state.totalSkins}</span>
            }

            {
              this.state.purchaseableSkins > 0 &&
              <span className="margin-left-10">Buyable skins: {this.state.purchaseableSkins}</span>
            }
          </div>

        </div>
        <div className="width-20 padding-top-20 inline-block" style={{ verticalAlign: 'top' }}>
          <div>
            <RaisedButton label="Search" primary={true} onTouchTap={this._search} disabled={this.state.disableSearch} />
          </div>

          <div className="margin-top-10">
            {
              this.state.disableSearch &&
              <div>{this.state.searchState}</div>
            }
          </div>
        </div>
      </div>
    );
  }
}