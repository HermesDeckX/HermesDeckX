// SSH command snippets REST API service layer
import { get, post, put, del } from './request';

export interface SSHSnippet {
  id: number;
  host_id: number;
  name: string;
  command: string;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface SSHSnippetCreateReq {
  host_id: number;
  name: string;
  command: string;
  sort_order?: number;
}

export interface SSHSnippetUpdateReq {
  name: string;
  command: string;
  sort_order?: number;
}

export const snippetsApi = {
  list: (hostId: number) =>
    get<SSHSnippet[]>(`/api/v1/ssh/snippets?hostId=${hostId}`),
  create: (data: SSHSnippetCreateReq) =>
    post<SSHSnippet>('/api/v1/ssh/snippets', data),
  update: (id: number, data: SSHSnippetUpdateReq) =>
    put<SSHSnippet>(`/api/v1/ssh/snippets?id=${id}`, data),
  delete: (id: number) =>
    del<{ deleted: boolean }>(`/api/v1/ssh/snippets?id=${id}`),
};
