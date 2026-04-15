// SSH Hosts REST API service layer
import { get, post, put, del } from './request';

export interface SSHHost {
  id: number;
  name: string;
  host: string;
  port: number;
  username: string;
  auth_type: 'password' | 'key';
  has_password: boolean;
  has_key: boolean;
  fingerprint: string;
  save_password: boolean;
  is_favorite: boolean;
  last_connected_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface SSHHostCreateRequest {
  name: string;
  host: string;
  port: number;
  username: string;
  auth_type: 'password' | 'key';
  password?: string;
  private_key?: string;
  passphrase?: string;
  is_favorite?: boolean;
  save_password?: boolean;
}

export interface SSHHostTestResult {
  success: boolean;
  error?: string;
}

export const sshHostsApi = {
  list: () => get<SSHHost[]>('/api/v1/ssh-hosts'),

  create: (data: SSHHostCreateRequest) =>
    post<SSHHost>('/api/v1/ssh-hosts', data),

  update: (id: number, data: Partial<SSHHostCreateRequest>) =>
    put<SSHHost>(`/api/v1/ssh-hosts?id=${id}`, data),

  delete: (id: number) =>
    del<{ deleted: boolean }>(`/api/v1/ssh-hosts?id=${id}`),

  test: (data: SSHHostCreateRequest) =>
    post<SSHHostTestResult>('/api/v1/ssh-hosts/test', data),
};
