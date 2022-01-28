import React, { Component } from 'react';
import _ from 'underscore';
import classnames from 'classnames';

export default class BasicModal extends Component {
  constructor(props) {
    super(props);
  }

  render() {
    return (
      <div className={classnames('modal', { 'is-active': this.props.open })}>
        <div
          onClick={this.props.handleClose}
          className="modal-background"
        />
        <div className="modal-content">
          <div
            className={classnames(
              'box modal-basic-style',
              this.props.modalClasses,
            )}
          >
            <div className="modal-title-wrapper level is-mobile">
              <div className="level-left">
                <div className="level-item">
                  <b className="modal-title">{this.props.title}</b>
                </div>
              </div>
              <div className="level-right">
                <div className="level-item">
                  <span
                    className="icon ion-icon clickable is-medium"
                    onClick={this.props.handleClose}
                  >
                    <ion-icon name="close-outline" />
                  </span>
                </div>
              </div>
            </div>
            <div className="modal-body">{this.props.children}</div>
          </div>
        </div>
      </div>
    );
  }
}
