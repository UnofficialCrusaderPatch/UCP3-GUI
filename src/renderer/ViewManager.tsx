import React, { Component } from 'react';
import { HashRouter as Router, Route, Routes } from 'react-router-dom';

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
    const sloc = global.location.search;
    const partStart = sloc.lastIndexOf('?') + 1;
    let partEnd = sloc.indexOf('=', partStart);
    if (partEnd === -1) partEnd = sloc.length;
    let name: string = sloc.substring(partStart, partEnd);
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
          <Route path="landing" element={<App />} />
          <Route path="editor" element={<Manager />} />
          <Route path="/landing" element={<App />} />
          <Route path="/editor" element={<Manager />} />
          <Route path="#landing" element={<App />} />
          <Route path="#editor" element={<Manager />} />
        </Routes>
      </Router>
    );
  }
}

export default ViewManager;
