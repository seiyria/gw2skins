
import _ from 'lodash';
import React from 'react';
import { Table, unsafe } from 'reactable';

export default class Results extends React.Component {

  _toGold(value) {
    const gold = Math.floor((value/10000) % 10000);
    const silver = Math.floor((value/100) % 100);
    const copper = value % 100;

    const gString = gold > 0 ? `${gold}g ` : '';
    const sString = silver > 0 ? `${silver}s ` : '';
    const cString = copper > 0 ? `${copper}c` : '';

    return `${gString}${sString}${cString}`;
  }

  _fromGold(value) {
    if(value === 'not available') return 0;

    const multipliers = { c: 1, s: 100, g: 10000 };

    const parts = _.compact(value.split(' '));
    return _.reduce(parts, (prev, part) => {
      const type = part.substr(part.length-1);
      return prev + (parseInt(part) * multipliers[type]);
    }, 0);
  }

  render() {
    const tableColumns = [
      { label: '', key: 'iconUnsafe' },
      { label: 'Name', key: 'name' },
      { label: 'Type', key: 'type' },
      { label: 'Cost', key: 'cost' },
      { label: 'Chat Link', key: 'chat_link' }
    ];

    const sorts = [
      { column: 'name', sortFunction: (a, b) => a > b ? 1 : -1 },
      { column: 'type', sortFunction: (a, b) => a > b ? 1 : -1 },
      { column: 'cost', sortFunction: (a, b) => {
        return this._fromGold(a) > this._fromGold(b) ? 1 : -1;
      } }
    ];

    const data = _.map(this.props.items, item => {
      item.iconUnsafe = unsafe(`<img src="${item.icon}" width="64" height="64" />`);
      item.cost = item.priceData.sells.unit_price ? this._toGold(item.priceData.sells.unit_price) : 'not available';
      return item;
    });

    return (
      <div>
        <div>Results</div>
        <Table className="results"
               data={data}
               itemsPerPage={25}
               pageButtonLimit={10}
               sortable={sorts}
               filterable={['name']}
               columns={tableColumns}
               defaultSort={{ column: 'cost', direction: 'desc' }}
               noDataText="No items meet this criteria." />
      </div>
    );
  }

}