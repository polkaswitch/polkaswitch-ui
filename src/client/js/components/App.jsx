import React, { Component } from 'react';

import {
  BrowserRouter as Router,
  Switch,
  Route,
  Link,
  Redirect
} from "react-router-dom";

import SwapHome from './pages/SwapHome';
import TokenClaimHome from './pages/TokenClaimHome';
import Footer from './partials/Footer';
import classnames from 'classnames';
import {switchToDarkMode, switchToLightMode} from "../stores/darkModeSlice";
import {connect} from "react-redux";

require('../../css/index.scss');

class App extends Component {
  constructor(props) {
    super(props);
    this.state = { fullscreen: false };
  }

  componentDidMount() {
    const isDarkMode = localStorage.getItem("isDarkMode");
    if(isDarkMode === "true"){
      this.props.switchToDarkMode();
    }else{
      this.props.switchToLightMode();
    }
    this.handleFullScreenOn = this.handleFullScreenOn.bind(this);
    this.handleFullScreenOff = this.handleFullScreenOff.bind(this);
    window.document.addEventListener('fullScreenOn', this.handleFullScreenOn);
    window.document.addEventListener('fullScreenOff', this.handleFullScreenOff);
  }

  componentWillUnmount() {
    window.document.removeEventListener('fullScreenOn', this.handleFullScreenOn);
    window.document.removeEventListener('fullScreenOff', this.handleFullScreenOff);
  }

  handleFullScreenOn() {
    this.setState({
      fullscreen: true
    });
  }

  handleFullScreenOff() {
    this.setState({
      fullscreen: false
    });
  }

  render() {
    return (
      <Router>
        <div className={classnames({ fullscreen: this.state.fullscreen })}>
          <Switch>
            <Route exact path="/">
              <Redirect to="/swap" />
            </Route>
            <Route path="/swap">
              <SwapHome />
            </Route>
            <Route path="/claim">
              <TokenClaimHome />
            </Route>
            <Route>
              <Redirect to="/swap" />
            </Route>
          </Switch>
          <Footer />
        </div>
      </Router>
    );
  }
}

const mapStateToProps = (state) => ({
});

const mapDispatchToProps = { switchToLightMode, switchToDarkMode };

export default connect(mapStateToProps, mapDispatchToProps)(App);
