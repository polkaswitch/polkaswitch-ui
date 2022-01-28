import React from 'react';

export default function AdditionalInfoItem(props) {
  const { info } = props;

  return (
    <div className="additional-info">
      <div className="fee-wrapper">
        <span className="title">Fees</span>
        <span className="value">{info.fee}</span>
      </div>
      <div className="duration-wrapper">
        <span className="title">Duration</span>
        <span className="value">{info.duration}</span>
      </div>
    </div>
  );
}
