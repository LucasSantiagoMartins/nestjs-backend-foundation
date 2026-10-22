export class PaginationDto {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface PaginatedDto<T> {
  items: T[];
  pagination: PaginationDto;
}
