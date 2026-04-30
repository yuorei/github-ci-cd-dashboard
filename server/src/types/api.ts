export type Pagination = {
  limit: number;
  offset: number;
};

export type ApiError = {
  error: string;
  details?: unknown;
};
