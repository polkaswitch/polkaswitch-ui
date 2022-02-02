import React, { useEffect, useState } from 'react';
import _ from 'underscore';
import classnames from 'classnames';
import CoingeckoManager from '../../utils/coingecko';

export default function TokenIconImg(props) {
  const imgURL = props.imgSrc || (props.token && props.token.logoURI);
  // init state
  const [errored, setErrored] = useState(false);
  const [imgSrc, setImgSrc] = useState('');

  useEffect(async () => {
    if (!imgURL) {
      if (props.token && props.token.address) {
        const logoURL = await getLogoURL();
        if (logoURL) {
          setImgSrc(logoURL);
        } else {
          setErrored(true);
        }
      } else {
        setErrored(true);
      }
    } else {
      setImgSrc(imgURL);
    }
  }, [imgURL, props.token?.symbol, props.token?.address]);

  const onError = (e) => {
    setErrored(true);
  };

  const onLoad = (e) => {
    setErrored(false);
  };

  const getLogoURL = async () => {
    const network = props.network || TokenListManager.getCurrentNetworkConfig();
    const assetPlatform = (network.coingecko && network.coingecko.platform) || '';
    return await CoingeckoManager.getLogoURL(assetPlatform, props.token.address);
  };

  return (
    <span
      className={classnames('token-icon-img-wrapper', { errored })}
      style={{
        height: `${props.size || 40}px`,
        width: `${props.size || 40}px`,
        marginRight: `${props.mr || 0}px`,
        zIndex: `${props.z_index || 0}`,
      }}
    >
      <img
        {..._.omit(props, 'imgSrc', 'token', 'size')}
        onLoad={onLoad}
        onError={onError}
        style={{
          height: `${props.size || 40}px`,
          width: `${props.size || 40}px`,
        }}
        src={imgSrc}
      />
      <span className="icon">
        <ion-icon name="cube-outline" />
      </span>
    </span>
  );
}
