import React, { useState, useEffect, useMemo } from 'react';
import _ from 'underscore';
import TxStatusView from '../TxStatusView';
import TxQueue from '../../../utils/txQueue';
import EventManager from '../../../utils/events';

// TODO WIP component, not used anywhere

export default function TxnHistory() {
  const itemMax = 3;
  const [queue, setQueue] = useState({});
  const [page, setPage] = useState(1);
  const [maxPage, setMaxPage] = useState(1);
  const [refresh, setRefresh] = useState(Date.now());

  useEffect(() => {
    setMaxPage(1);
    setPage(1);
    const { length } = Object.keys(queue);
    if (length > 0) {
      let extraPages = 1;
      if (length % itemMax === 0) {
        extraPages = 0;
      }
      setMaxPage(Math.floor(length / itemMax) + extraPages);
    }
  }, [queue, itemMax]);

  // Fetch Data
  useEffect(() => {
    setPage(1);
    setQueue(TxQueue.getQueue());
    const subTxUpdates = EventManager.listenFor('txQueueUpdated', handleUpdate);
    const subUpdates = EventManager.listenFor('walletUpdated', handleUpdate);
    return () => {
      subTxUpdates.unsubscribe();
      subUpdates.unsubscribe();
    };
  }, []);

  const handleUpdate = () => {
    setRefresh(Date.now());
    setQueue(TxQueue.getQueue());
  };

  const filteredList = useMemo(
    () =>
      queue &&
      Object.keys(queue)
        .map((key) => queue[key])
        .slice(itemMax * (page - 1), page * itemMax),
    [queue, itemMax, page, refresh],
  );

  return (
    <div>
      {refresh && queue && Object.keys(queue).length > 0 && (
        <div className="grid-table">
          <div className="title-bar">Trade History</div>
          <div className="body">
            {filteredList &&
              _.map(filteredList, (item, i) => (
                <div key={i} className="row">
                  <TxStatusView key={i} data={item} />
                </div>
              ))}
          </div>
          <div className="page-button">
            <div onClick={() => setPage(page === 1 ? page : page - 1)}>
              <div className="arrow">←</div>
            </div>
            <div>{`Page ${page} of ${maxPage}`}</div>
            <div onClick={() => setPage(page === maxPage ? page : page + 1)}>
              <div className="arrow">→</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
