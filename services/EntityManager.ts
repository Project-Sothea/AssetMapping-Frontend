export interface EntityManager<TCreate, TUpdate, TDelete> {
  createLocally(data: TCreate): Promise<void>;
  updateLocally(data: TUpdate): Promise<void>;
  deleteLocally(data: TDelete): Promise<void>;
}
