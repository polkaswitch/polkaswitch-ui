import React, {
  useState, useEffect, useMemo, useRef
} from 'react';
import classnames from 'classnames';

// TODO WIP component, not used anywhere

export default function Search() {
  const [showMenu, toggleMenu] = useState(false);
  const [value, setValue] = useState('');
  const [searchedTokens, setSearchedTokens] = useState([]);
  const [searchedPairs, setSearchedPairs] = useState([]);
  const [, toggleShadow] = useState(false);
  const [, toggleBottomShadow] = useState(false);
  const [tokensShown, setTokensShown] = useState(3);
  const [pairsShown, setPairsShown] = useState(3);

  // refs to detect clicks outside modal
  const wrapperRef = useRef();
  const menuRef = useRef();

  useEffect(() => {
    if (value !== '') {
      toggleMenu(true);
    } else {
      toggleMenu(false);
    }
  }, [value]);

  const filteredTokenList = useMemo(() => [], [value]);

  const filteredPairList = useMemo(() => [], [value]);

  useEffect(() => {
    if (Object.keys(filteredTokenList).length > 2) {
      toggleShadow(true);
    } else {
      toggleShadow(false);
    }
  }, [filteredTokenList]);

  useEffect(() => {
    if (Object.keys(filteredPairList).length > 2) {
      toggleBottomShadow(true);
    } else {
      toggleBottomShadow(false);
    }
  }, [filteredPairList]);

  const handleClick = (e) => {
    if (
      !(menuRef.current && menuRef.current.contains(e.target))
      && !(wrapperRef.current && wrapperRef.current.contains(e.target))
    ) {
      setPairsShown(3);
      setTokensShown(3);
      toggleMenu(false);
    }
  };

  useEffect(() => {
    document.addEventListener('click', handleClick);
    return () => {
      document.removeEventListener('click', handleClick);
    };
  });

  function onDismiss() {
    setPairsShown(3);
    setTokensShown(3);
    toggleMenu(false);
    setValue('');
  }

  return (
    <div className="search-container">
      <div
        className="wrapper"
        style={{
          borderBottomLeftRadius: showMenu ? 0 : 24,
          borderBottomRightRadius: showMenu ? 0 : 24,
        }}
      >
        <span className="icon is-left">
          <ion-icon name="search-outline" class="search-icon" />
        </span>
        <input
          className="input-box"
          type="text"
          ref={wrapperRef}
          placeholder="Search token or pair..."
          value={value}
          onChange={(e) => {
            setValue(e.target.value);
          }}
          onFocus={() => {
            if (!showMenu) {
              toggleMenu(true);
            }
          }}
        />
        {showMenu && (
          <span
            className="icon close-icon is-right"
            style={{ cursor: 'pointer' }}
            onClick={() => toggleMenu(false)}
          >
            <ion-icon name="close-outline" class="close-icon" />
          </span>
        )}
      </div>
      <div
        className={classnames('menu', {
          'is-hidden': !showMenu,
        })}
        ref={menuRef}
      >
        <div className="header">
          <div>Tokens</div>
        </div>
        <div>
          {Object.keys(filteredTokenList).length === 0 && (
            <div className="menu-item">
              <div>No results</div>
            </div>
          )}
          {filteredTokenList.slice(0, tokensShown).map((token) => <div className="menu-item" />)}
          <div
            className={classnames('header', {
              'is-hidden': !(
                Object.keys(filteredTokenList).length > 3
                && Object.keys(filteredTokenList).length >= tokensShown
              ),
            })}
          >
            <div
              className="more-link"
              onClick={() => {
                setTokensShown(tokensShown + 5);
              }}
            >
              See more...
            </div>
          </div>
        </div>
        <div className="header">
          <div>Pairs</div>
        </div>
        <div>
          {filteredPairList && Object.keys(filteredPairList).length === 0 && (
            <div className="menu-item">
              <div>No results</div>
            </div>
          )}
          {filteredPairList
            && filteredPairList.slice(0, pairsShown).map((pair) => <div className="menu-item" />)}
          <div
            className={classnames('header', {
              'is-hidden': !(
                Object.keys(filteredPairList).length > 3
                && Object.keys(filteredPairList).length >= pairsShown
              ),
            })}
          >
            <div
              className="more-link"
              onClick={() => {
                setPairsShown(pairsShown + 5);
              }}
            >
              See more...
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
