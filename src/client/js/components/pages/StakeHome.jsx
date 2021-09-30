
import React, { Component } from 'react';
import Navbar from '../partials/navbar/Navbar';
import MobileMenu from "../partials/navbar/MobileMenu";

export default class Stake extends Component {
  render() {
    return (
      <div className="container">
        <Navbar />
        <MobileMenu />
      </div>
    );
  }
}