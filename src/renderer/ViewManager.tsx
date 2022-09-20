import React, { Component } from 'react';
import { MemoryRouter as Router, Route, Routes } from 'react-router-dom';

import App from './App';
import Manager from './Manager';

type ViewList = {
  [key: string]: JSX.Element;
};

class ViewManager extends Component {
  static Views(): ViewList {
    return {
      landing: <App />,
      editor: <Manager />,
    };
  }

  static View() {
    const sp = new URLSearchParams(global.location.search);
    if (sp.has('window')) {
      return ViewManager.Views()[sp.get('window') as string];
    }
    return ViewManager.Views().landing;
    /*  
    const sloc = global.location.search;
    const partStart = sloc.lastIndexOf('?') + 1;
    let partEnd = sloc.indexOf('=', partStart);
    if (partEnd === -1) partEnd = sloc.length;
    let name: string = sloc.substring(partStart, partEnd);
    if (name === '') name = 'landing';
    console.log(`view name:  ${name}`);
    const view: JSX.Element = ViewManager.Views()[name];
    if (view == null) throw new Error(`View '${name}' is undefined`);
    return view; */
  }

  render() {
    return (
      <Router initialEntries={['/index.html']}>
        <Routes>
          <Route path="/index.html" element={<ViewManager.View />} />
        </Routes>
      </Router>
    );
  }
}

export default ViewManager;
