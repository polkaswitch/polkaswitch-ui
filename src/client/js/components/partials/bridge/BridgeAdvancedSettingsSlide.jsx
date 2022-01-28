import React, { Component } from 'react';

export default class BridgeAdvancedSettingsSlide extends Component {
  constructor(props) {
    super(props);
    this.state = { refresh: Date.now() };
  }

  componentWillUnmount() {}

  render() {
    return (
      <div className="page page-stack page-view-settings">
        <div className="page-inner" />
      </div>
    );
  }
}
