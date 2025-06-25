export type DataState<T> = {
  data: T | null;
  error: string | null;
  loading: boolean;
};
