import React, { Component } from 'react';
import _ from 'underscore';
import classnames from 'classnames';
import BasicModal from './BasicModal';

export default class DropdownSelectModal extends Component {
  constructor(props) {
    super(props);
  }

  render() {
    return (
      <BasicModal
        modalClasses="modal-dropdown-options"
        open={this.props.open}
        title={this.props.title}
        handleClose={this.props.handleClose}
      >
        {this.props.children}
      </BasicModal>
    );
  }
}
