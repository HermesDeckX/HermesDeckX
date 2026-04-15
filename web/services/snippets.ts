// SSH command history REST API service layer
import { get, post, put, del } from './request';

export interface SSHSnippet {
  id: number;
  host_id: number;
  command: string;
  is_favorite: boolean;
  created_at: string;
  updated_at: string;
}

export const snippetsApi = {
  list: (hostId: number) =>
    get<SSHSnippet[]>(`/api/v1/ssh/snippets?hostId=${hostId}`),
  record: (hostId: number, command: string) =>
    post<SSHSnippet>('/api/v1/ssh/snippets', { host_id: hostId, command }),
  toggleFavorite: (id: number) =>
    put<SSHSnippet>(`/api/v1/ssh/snippets/favorite?id=${id}`, {}),
  delete: (id: number) =>
    del<{ deleted: boolean }>(`/api/v1/ssh/snippets?id=${id}`),
};
