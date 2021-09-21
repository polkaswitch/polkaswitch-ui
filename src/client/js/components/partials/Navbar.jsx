import React, { Component } from 'react';

import {
  BrowserRouter as Router,
  Switch,
  Route,
  Link
} from "react-router-dom";

import ConnectWalletButton from './ConnectWalletButton';
import NotificationButton from './NotificationButton';
import BridgeButton from './BridgeButton';
import TokenSearchBar from './TokenSearchBar';
import Toggle from 'react-toggle';
import 'react-toggle/style.css';
import '../../../css/custom/switch.scss';
import { connect } from "react-redux";
import { switchToDarkMode, switchToLightMode } from "../../stores/darkModeSlice";


class Navbar extends Component {
  state = {
    isDarkMode:false,
  }

  componentWillReceiveProps(nextProps) {
    if (nextProps.isDarkMode !== this.props.isDarkMode) {
      debugger
      this.setState({ isDarkMode: nextProps.isDarkMode });
      if(nextProps.isDarkMode){
        this.changeColor("#201923");
      }else{
        this.changeColor("#f2f7f9");
      }
    }
  }

  changeColor = (color) => {
    document.body.style.backgroundColor = color;
    const bodyElt = document.querySelector("html");
    bodyElt.style.backgroundColor = color;
  }

  switchThemeMode = () => {
    debugger
    if(this.state.isDarkMode){
      this.props.switchToLightMode();
      this.changeColor("#f2f7f9");
      localStorage.setItem("isDarkMode",false);
    }else{
      this.props.switchToDarkMode();
      this.changeColor("#201923");
      localStorage.setItem("isDarkMode",true);
    }
    this.setState({isDarkMode:!this.state.isDarkMode});
  }

  render() {
    return (
      <nav id="nav" className="level is-mobile" style={{ display: "flex" }}>
        <div className="level-left is-flex-grow-1">
          <div className="level-item is-narrow">
            <span className="logo-icon icon is-left is-hidden-mobile">
              <img src="/images/logo_dark.svg" />
            </span>
            <span className="logo-icon icon is-left is-hidden-tablet">
              <img src="/images/logo_only.svg" />
            </span>
          </div>
          <div className="level-item is-flex-grow-3 is-justify-content-left is-hidden-touch">
            { /* <TokenSearchBar width={"75%"} /> */ }
          </div>
        </div>

        <div className="level-right">
          <Toggle
              className="custom-classname mr-3"
              icons={false}
              checked={this.state.isDarkMode}
              onChange={this.switchThemeMode}
          />
          <div className="level-item is-narrow"><BridgeButton /></div>
          <div className="level-item is-narrow"><NotificationButton /></div>
          <div className="level-item is-narrow"><ConnectWalletButton /></div>
        </div>
      </nav>
    );
  }
}

const mapStateToProps = (state) => ({
  isDarkMode: state.darkMode.isDarkMode
});

const mapDispatchToProps = { switchToLightMode, switchToDarkMode };

export default connect(mapStateToProps, mapDispatchToProps)(Navbar);
