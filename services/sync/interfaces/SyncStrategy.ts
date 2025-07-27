export default interface SyncStrategy<LocalType, RemoteType> {
  resolve(
    local: LocalType[],
    remote: RemoteType[]
  ): {
    toPullToLocal: RemoteType[];
    toPushToRemote: LocalType[];
  };
  convertToRemote(remoteItems: RemoteType[]): LocalType[];
  convertToLocal(pins: LocalType[]): RemoteType[];
}
