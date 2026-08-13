
export interface TMessage {
  return_code?: number;
  return_message?: string;
}

export interface Paging {
  page?: number;
  page_size?: number;
  all?: boolean;
}

export type TPagingResponse<T> = {
  return_code: number;
  return_message: string;
  data: {
    total_items: number;
    total_pages: number;
    current_page: number;
    page_size: number;
    has_next_page: boolean;
    has_prev_page: boolean;
    items: T[];
  };
};
