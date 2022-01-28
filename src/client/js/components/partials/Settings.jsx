import React, { Component } from 'react';
import _ from 'underscore';
import classnames from 'classnames';
import { setTheme } from '../../utils/theme';

// TODO WIP component, not used anywhere

export default class Settings extends Component {
  constructor(props) {
    super(props);
    this.state = {
      showing: false,
      darkMode: false,
      viewMode: false,
    };
  }

  handleDarkModeChange = (event) => {
    if (event.target.checked) {
      setTheme('theme-light');
    } else {
      setTheme('theme-dark');
    }
    this.setState({ darkMode: event.target.checked });
  };

  handleViewModeChange = (event) => {
    this.setState({ viewMode: event.target.checked });
  };

  handleClick = () => {
    const { showing } = this.state;
    this.setState({ showing: !showing });
  };

  render() {
    const { showing } = this.state;

    return (
      <div>
        <span
          className="icon clickable settings-icon"
          onClick={this.handleClick}
        >
          <ion-icon name="settings-outline" />
        </span>
        {showing && (
          <div className="flyout">
            <div className="menu-item">About</div>
            <div className="menu-item">Documentation</div>
            <div className="menu-item">Help</div>
            <div className="menu-item">Telegram</div>
            <div className="divider" />
            <div className="menu-item">
              Dark Mode
              <span className="item-switcher hint--bottom hint--medium">
                <input
                  id="dark-mode-switcher"
                  type="checkbox"
                  checked={this.state.darkMode}
                  onChange={this.handleDarkModeChange}
                />
                <label htmlFor="dark-mode-switcher" />
              </span>
            </div>
            <div className="menu-item">
              Simplify View
              <span className="item-switcher hint--bottom hint--medium">
                <input
                  id="simplify-mode-switcher"
                  type="checkbox"
                  checked={this.state.viewMode}
                  onChange={this.handleViewModeChange}
                />
                <label htmlFor="simplify-mode-switcher" />
              </span>
            </div>
          </div>
        )}
      </div>
    );
  }
}
