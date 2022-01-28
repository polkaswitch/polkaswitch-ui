import React, { Component } from 'react';

export default class Footer extends Component {
  render() {
    return (
      <footer className="footer">
        <div className="content has-text-centered is-hidden">
          <script
            type="module"
            src="https://cdn.freshstatus.io/widget/index.js"
          />
          <a
            href="https://polkaswitch.freshstatus.io"
            id="freshstatus-badge-root"
            data-banner-style="compact"
          >
            <img src="https://public-api.freshstatus.io/v1/public/badge.svg/?badge=826087c7-9469-492a-8821-928a674cc49e" />
          </a>
        </div>

        <button data-feedback-fish className="footer-feedback button is-medium">
          <span className="icon">
            <ion-icon name="alert-circle" />
          </span>
          <span>Give Feedback</span>
        </button>
      </footer>
    );
  }
}
