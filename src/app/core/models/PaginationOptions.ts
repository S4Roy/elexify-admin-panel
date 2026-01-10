export default class PaginationOptions {
  limit: number = 50;
  page: number = 1;
  total_pages: number = 0;
  total_records: number = 0;
  hasNextPage: boolean = false;
  hasPrevPage: boolean = false;
  // limit: number = 10;
  nextPage: number = 0;
  // page: number = 1;
  pagingCounter: number = 0;
  prevPage: number = 0;
  totalDocs: number = 0;
  totalPages: number = 0;
}
