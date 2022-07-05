import React, { Component } from 'react';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';

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
    let name: string = global.location.search.substring(1);
    const eq = name.indexOf('=', 1);
    if (eq > 0) {
      name = name.substring(0, eq);
    }
    if (name === '') name = 'landing';
    const view: JSX.Element = ViewManager.Views()[name];
    if (view == null) throw new Error(`View '${name}' is undefined`);
    return view;
  }

  render() {
    return (
      <Router>
        <Routes>
          <Route path="/index.html" element={<ViewManager.View />} />
        </Routes>
      </Router>
    );
  }
}

export default ViewManager;
