import React, { Component } from 'react';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';

import App from './App';
import Editor from './Editor';

type ViewList = {
  [key: string]: JSX.Element;
};

class ViewManager extends Component {
  static Views(): ViewList {
    return {
      landing: <App />,
      editor: <Editor />,
    };
  }

  static View() {
    let name: string = global.location.search.substr(1);
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
