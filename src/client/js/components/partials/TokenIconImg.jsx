import React, { Component } from 'react';
import _ from "underscore";
import classnames from 'classnames';
import Storage from "../../utils/storage";

export default class TokenIconImg extends Component {
  constructor(props) {
    super(props);
    this.state = { errored: false };
    this.onError = this.onError.bind(this);
    this.onLoad = this.onLoad.bind(this);
  }

  onError(e) {
    this.setState({ errored: true });
  }

  onLoad(e) {
    this.setState({ errored: false });
  }

  render() {
    let errored = this.state.errored;
    let imgSrc;

    if (!errored) {
      imgSrc = this.props.imgSrc || (this.props.token && this.props.token.logoURI);

      if (!imgSrc) {
        if (this.props.token) {
          var network = this.props.network || TokenListManager.getCurrentNetworkConfig();
          const chainPart = network.name.toLowerCase().replace(/\s+/g, '');
          const keyPart = this.props.token.address || this.props.token.symbol;
          imgSrc = `https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/${chainPart}/assets/${keyPart}/logo.png`;
        } else {
          errored = true;
        }
      }
    }

    return (
      <span
        className={classnames("token-icon-img-wrapper", { "errored": errored })}
        style={{
          height: `${this.props.size || 40}px`,
          width: `${this.props.size || 40}px`,
          marginLeft: `${this.props.ml || 0}px`,
          marginRight: `${this.props.mr || 0}px`,
          zIndex: `${this.props.z_index || 0}`
        }}>
        <img
          { ... _.omit(this.props, 'imgSrc', 'token', 'size') }
          onLoad={this.onLoad}
          onError={this.onError}
          style={{
            height: `${this.props.size || 40}px`,
            width: `${this.props.size || 40}px`
          }}
          src={imgSrc} />
        <span className="icon">
          <ion-icon name="cube-outline"></ion-icon>
        </span>
      </span>
    );
  }
}

