// SFTP REST API service layer
import { get, post } from './request';

export interface FileEntry {
  name: string;
  path: string;
  size: number;
  is_dir: boolean;
  mode: string;
  mod_time: number;
}

export interface ListResult {
  path: string;
  entries: FileEntry[];
}

export const sftpApi = {
  list: (sessionId: string, path?: string) => {
    const params = new URLSearchParams({ sessionId });
    if (path) params.set('path', path);
    return get<ListResult>(`/api/v1/sftp/list?${params}`);
  },

  mkdir: (sessionId: string, path: string) =>
    post<{ created: boolean }>('/api/v1/sftp/mkdir', { sessionId, path }),

  remove: (sessionId: string, path: string) =>
    post<{ removed: boolean }>('/api/v1/sftp/remove', { sessionId, path }),

  rename: (sessionId: string, oldPath: string, newPath: string) =>
    post<{ renamed: boolean }>('/api/v1/sftp/rename', { sessionId, oldPath, newPath }),

  downloadUrl: (sessionId: string, path: string) => {
    const params = new URLSearchParams({ sessionId, path });
    const token = sessionStorage.getItem('jwt_token') || '';
    if (token) params.set('token', token);
    return `/api/v1/sftp/download?${params}`;
  },

  upload: async (sessionId: string, remotePath: string, file: File): Promise<{ path: string; size: number; filename: string }> => {
    const params = new URLSearchParams({ sessionId, path: remotePath });
    const formData = new FormData();
    formData.append('file', file);

    const token = sessionStorage.getItem('jwt_token') || '';
    const resp = await fetch(`/api/v1/sftp/upload?${params}`, {
      method: 'POST',
      body: formData,
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      credentials: 'include',
    });

    if (!resp.ok) {
      const body = await resp.json().catch(() => ({}));
      throw new Error(body?.message || `Upload failed: ${resp.status}`);
    }
    const data = await resp.json();
    return data.data ?? data;
  },
};
