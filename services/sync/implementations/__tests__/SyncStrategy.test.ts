import { SyncStrategy } from '../SyncStrategy';

type LocalType = {
  id: string;
  updatedAt: string | null;
  deletedAt: string | null;
  status: string | null;
};

type RemoteType = {
  id: string;
  updated_at: string | null;
  deleted_at: string | null;
};

const strategy = new SyncStrategy<LocalType, RemoteType>();

describe('SyncStrategy', () => {
  it('syncs new remote items to local', () => {
    const local: LocalType[] = [];
    const remote: RemoteType[] = [
      { id: '1', updated_at: '2023-01-01T00:00:00Z', deleted_at: null },
    ];

    const { toLocal, toRemote } = strategy.resolve(local, remote);

    expect(toLocal).toHaveLength(1);
    expect(toLocal[0].id).toBe('1');
    expect(toRemote).toHaveLength(0);
  });

  it('syncs new local items to remote', () => {
    const local: LocalType[] = [
      { id: '2', updatedAt: '2023-01-02T00:00:00Z', deletedAt: null, status: 'dirty' },
    ];
    const remote: RemoteType[] = [];

    const { toLocal, toRemote } = strategy.resolve(local, remote);

    expect(toRemote).toHaveLength(1);
    expect(toRemote[0].id).toBe('2');
    expect(toLocal).toHaveLength(0);
  });

  it('syncs deleted remote items to local', () => {
    const local: LocalType[] = [
      { id: '3', updatedAt: '2023-01-02T00:00:00Z', deletedAt: null, status: 'synced' },
    ];
    const remote: RemoteType[] = [
      { id: '3', updated_at: '2023-01-03T00:00:00Z', deleted_at: '2023-01-03T00:00:00Z' },
    ];

    const { toLocal, toRemote } = strategy.resolve(local, remote);

    expect(toLocal).toHaveLength(1);
    expect(toLocal[0].id).toBe('3');
    expect(toRemote).toHaveLength(0);
  });

  it('syncs deleted local items to remote', () => {
    const local: LocalType[] = [
      {
        id: '4',
        updatedAt: '2023-01-04T00:00:00Z',
        deletedAt: '2023-01-04T00:00:00Z',
        status: 'dirty',
      },
    ];
    const remote: RemoteType[] = [
      { id: '4', updated_at: '2023-01-03T00:00:00Z', deleted_at: null },
    ];

    const { toLocal, toRemote } = strategy.resolve(local, remote);

    expect(toRemote).toHaveLength(1);
    expect(toRemote[0].id).toBe('4');
    expect(toLocal).toHaveLength(0);
  });

  it('syncs newer remote updates to local', () => {
    const local: LocalType[] = [
      { id: '5', updatedAt: '2023-01-05T00:00:00Z', deletedAt: null, status: 'synced' },
    ];
    const remote: RemoteType[] = [
      { id: '5', updated_at: '2023-01-06T00:00:00Z', deleted_at: null },
    ];

    const { toLocal, toRemote } = strategy.resolve(local, remote);

    expect(toLocal).toHaveLength(1);
    expect(toLocal[0].id).toBe('5');
    expect(toRemote).toHaveLength(0);
  });

  it('syncs newer local updates to remote', () => {
    const local: LocalType[] = [
      { id: '6', updatedAt: '2023-01-07T00:00:00Z', deletedAt: null, status: 'dirty' },
    ];
    const remote: RemoteType[] = [
      { id: '6', updated_at: '2023-01-06T00:00:00Z', deleted_at: null },
    ];

    const { toLocal, toRemote } = strategy.resolve(local, remote);

    expect(toRemote).toHaveLength(1);
    expect(toRemote[0].id).toBe('6');
    expect(toLocal).toHaveLength(0);
  });

  it('syncs dirty local items to remote when timestamps are equal', () => {
    const local: LocalType[] = [
      { id: '7', updatedAt: '2023-01-08T00:00:00Z', deletedAt: null, status: 'dirty' },
    ];
    const remote: RemoteType[] = [
      { id: '7', updated_at: '2023-01-08T00:00:00Z', deleted_at: null },
    ];

    const { toLocal, toRemote } = strategy.resolve(local, remote);

    expect(toRemote).toHaveLength(1);
    expect(toRemote[0].id).toBe('7');
    expect(toLocal).toHaveLength(0);
  });

  it('does not sync when timestamps are equal and local is not dirty', () => {
    const local: LocalType[] = [
      { id: '8', updatedAt: '2023-01-09T00:00:00Z', deletedAt: null, status: null },
    ];
    const remote: RemoteType[] = [
      { id: '8', updated_at: '2023-01-09T00:00:00Z', deleted_at: null },
    ];

    const { toLocal, toRemote } = strategy.resolve(local, remote);

    expect(toLocal).toHaveLength(0);
    expect(toRemote).toHaveLength(0);
  });
});
