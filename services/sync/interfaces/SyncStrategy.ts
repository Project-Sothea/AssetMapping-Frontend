export default interface SyncStrategy<LocalType, RemoteType> {
  resolve(
    local: LocalType[],
    remote: RemoteType[]
  ): {
    toLocal: RemoteType[];
    toRemote: LocalType[];
  };
  convertToLocal(remoteItems: RemoteType[]): LocalType[];
  convertToRemote(pins: LocalType[]): RemoteType[];
}
