import { useEffect } from 'react';
import { useFetchRemotePins } from './Pins';
import SyncManager from '~/services/sync/SyncManager';

export const useRemoteToLocalSync = () => {
  const { data: remotePins, isFetching } = useFetchRemotePins();
  // console.log('fetching', isFetching);
  const syncManager = SyncManager.getInstance();

  useEffect(() => {
    if (remotePins && remotePins.length > 0) {
      console.log('pins fetched:', remotePins.length);
      const clean = syncManager.cleanRemotePinData(remotePins);
      console.log('cleaned at:', Date());
      // console.log(clean);
      syncManager.pullToLocalDB(clean);
    }
  }, [remotePins]);
};
