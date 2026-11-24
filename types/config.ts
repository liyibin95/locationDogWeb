export type ConfigType = 'string' | 'number' | 'boolean' | 'json';

export type ConfigEnvironment = 'all' | 'prod' | 'beta' | 'dev';

export interface ConfigDocument {
  _id?: string;
  key: string;
  value: string;
  type: ConfigType;
  group: string;
  appId: string;
  environment: ConfigEnvironment;
  channel?: string;
  minVersionCode?: number;
  maxVersionCode?: number;
  description?: string;
  isEnabled: boolean;
  createdAt: string | Date;
  updatedAt: string | Date;
}

export interface CreateConfigInput {
  key: string;
  value: string;
  type: ConfigType;
  group?: string;
  appId?: string;
  environment?: ConfigEnvironment;
  channel?: string;
  minVersionCode?: number;
  maxVersionCode?: number;
  description?: string;
  isEnabled?: boolean;
}

export interface UpdateConfigInput extends Partial<CreateConfigInput> {
  _id?: string;
}

export interface ConfigQueryParams {
  page?: number;
  limit?: number;
  search?: string;
  group?: string;
  appId?: string;
  environment?: string;
  isEnabled?: string;
}

export interface ClientConfigQuery {
  appId?: string;
  environment?: string;
  channel?: string;
  versionCode?: number;
  group?: string;
  key?: string;
}

export interface ConfigStats {
  total: number;
  enabled: number;
  disabled: number;
  groups: { name: string; count: number }[];
  appIds: { name: string; count: number }[];
  environments: { name: string; count: number }[];
}
