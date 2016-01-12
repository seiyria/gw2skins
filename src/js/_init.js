
import injectTapEventPlugin from 'react-tap-event-plugin';
injectTapEventPlugin();

import React from 'react';
import ReactDOM from 'react-dom';
import pageLayout from './layouts/page';

ReactDOM.render(React.createElement(pageLayout), document.getElementById('content'));