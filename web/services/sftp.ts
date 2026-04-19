// SFTP REST API service layer
import { get, post, put } from './request';

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

export interface ReadFileResult {
  path: string;
  content: string;
  size: number;
  etag: string;
  mtime: number;
  line_ending: 'lf' | 'crlf';
}

export interface WriteFileResult {
  path: string;
  size: number;
  etag: string;
  saved: boolean;
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

  readFile: (sessionId: string, path: string) => {
    const params = new URLSearchParams({ sessionId, path });
    return get<ReadFileResult>(`/api/v1/sftp/read?${params}`);
  },

  writeFile: (sessionId: string, path: string, content: string, expectedEtag?: string) =>
    put<WriteFileResult>('/api/v1/sftp/write', {
      sessionId, path, content, expected_etag: expectedEtag || '',
    }),
};

// Local / Container files API — mirrors sftpApi shape exactly so call sites
// can be routed with a single ternary (see Terminal.tsx). The sessionId
// parameter is accepted for signature parity but ignored by the backend,
// which authenticates via the standard admin cookie/JWT middleware.
export const localFilesApi = {
  list: (_sessionId: string, path?: string) => {
    const params = new URLSearchParams();
    if (path) params.set('path', path);
    const qs = params.toString();
    return get<ListResult>(`/api/v1/local-files/list${qs ? `?${qs}` : ''}`);
  },

  mkdir: (_sessionId: string, path: string) =>
    post<{ created: boolean }>('/api/v1/local-files/mkdir', { path }),

  remove: (_sessionId: string, path: string, recursive = false) =>
    post<{ removed: boolean }>('/api/v1/local-files/remove', { path, recursive }),

  rename: (_sessionId: string, oldPath: string, newPath: string) =>
    post<{ renamed: boolean }>('/api/v1/local-files/rename', { oldPath, newPath }),

  downloadUrl: (_sessionId: string, path: string) => {
    const params = new URLSearchParams({ path });
    const token = sessionStorage.getItem('jwt_token') || '';
    if (token) params.set('token', token);
    return `/api/v1/local-files/download?${params}`;
  },

  upload: async (_sessionId: string, remotePath: string, file: File): Promise<{ path: string; size: number; filename: string }> => {
    const params = new URLSearchParams({ path: remotePath });
    const formData = new FormData();
    formData.append('file', file);

    const token = sessionStorage.getItem('jwt_token') || '';
    const resp = await fetch(`/api/v1/local-files/upload?${params}`, {
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

  readFile: (_sessionId: string, path: string) => {
    const params = new URLSearchParams({ path });
    return get<ReadFileResult>(`/api/v1/local-files/read?${params}`);
  },

  writeFile: (_sessionId: string, path: string, content: string, expectedEtag?: string) =>
    put<WriteFileResult>('/api/v1/local-files/write', {
      path, content, expected_etag: expectedEtag || '',
    }),
};

export type FilesApi = typeof sftpApi;
