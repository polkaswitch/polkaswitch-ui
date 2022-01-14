/* eslint-disable no-param-reassign */
import React from 'react';
import { Toast } from 'react-bootstrap';
// import Link from '../components/Link';

export function notify({
  message = '',
  description = undefined,
  txid = '',
  type = 'info',
  placement = 'bottomLeft',
}) {
  // if (txid) {
  //   //   <Link
  //   //     external
  //   //     to={'https://explorer.solana.com/tx/' + txid}
  //   //     style={{ color: '#0000ff' }}
  //   //   >
  //   //     View transaction {txid.slice(0, 8)}...{txid.slice(txid.length - 8)}
  //   //   </Link>

  //   description = <></>
  // }
  return (
    <Toast>
      <Toast.Header>
        <img src="holder.js/20x20?text=%20" className="rounded me-2" alt="" />
        <strong className="me-auto">
          {txid}
          {type}
          {message}
        </strong>
        <small>{description}</small>
      </Toast.Header>
      <Toast.Body>{placement}</Toast.Body>
    </Toast>
  );
}
