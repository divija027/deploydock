export interface AppTemplate {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: 'cms' | 'dev' | 'media' | 'productivity' | 'database';
  image: string;
  ports: Record<string, [{ HostPort: string }]>;
  env: Array<{ key: string; value: string; description?: string }>;
  volumes?: string[];
  docs?: string;
}

export const TEMPLATES: AppTemplate[] = [
  {
    id: 'ghost',
    name: 'Ghost CMS',
    description: 'Modern publishing platform for blogs and newsletters',
    icon: '👻',
    category: 'cms',
    image: 'ghost:5-alpine',
    ports: { '2368/tcp': [{ HostPort: '2368' }] },
    env: [
      { key: 'url', value: 'http://localhost:2368', description: 'Public URL of your Ghost blog' },
      { key: 'NODE_ENV', value: 'production' }
    ],
  },
  {
    id: 'gitea',
    name: 'Gitea',
    description: 'Lightweight self-hosted Git service',
    icon: '🐙',
    category: 'dev',
    image: 'gitea/gitea:latest',
    ports: {
      '3000/tcp': [{ HostPort: '3000' }],
      '22/tcp': [{ HostPort: '222' }]
    },
    env: [
      { key: 'GITEA__database__DB_TYPE', value: 'sqlite3' },
      { key: 'GITEA__database__PATH', value: '/data/gitea/gitea.db' }
    ],
  },
  {
    id: 'nextcloud',
    name: 'Nextcloud',
    description: 'Self-hosted file sync, calendar, and collaboration',
    icon: '☁️',
    category: 'productivity',
    image: 'nextcloud:stable-apache',
    ports: { '80/tcp': [{ HostPort: '8080' }] },
    env: [
      { key: 'NEXTCLOUD_ADMIN_USER', value: 'admin', description: 'Initial admin username' },
      { key: 'NEXTCLOUD_ADMIN_PASSWORD', value: 'changeme', description: 'Change this!' },
    ],
  },
  {
    id: 'uptime-kuma',
    name: 'Uptime Kuma',
    description: 'Self-hosted monitoring tool for your services',
    icon: '📊',
    category: 'dev',
    image: 'louislam/uptime-kuma:1',
    ports: { '3001/tcp': [{ HostPort: '3001' }] },
    env: [],
  },
  {
    id: 'vaultwarden',
    name: 'Vaultwarden',
    description: 'Lightweight Bitwarden-compatible password manager',
    icon: '🔐',
    category: 'productivity',
    image: 'vaultwarden/server:latest',
    ports: { '80/tcp': [{ HostPort: '8081' }] },
    env: [
      { key: 'ADMIN_TOKEN', value: '', description: 'Set a strong random token' },
      { key: 'SIGNUPS_ALLOWED', value: 'false' }
    ],
  },
  {
    id: 'n8n',
    name: 'n8n',
    description: 'Workflow automation — connects 400+ services',
    icon: '⚡',
    category: 'productivity',
    image: 'n8nio/n8n:latest',
    ports: { '5678/tcp': [{ HostPort: '5678' }] },
    env: [
      { key: 'N8N_BASIC_AUTH_ACTIVE', value: 'true' },
      { key: 'N8N_BASIC_AUTH_USER', value: 'admin' },
      { key: 'N8N_BASIC_AUTH_PASSWORD', value: 'changeme' }
    ],
  },
  {
    id: 'redis',
    name: 'Redis',
    description: 'In-memory data structure store, cache, and message broker',
    icon: '🟥',
    category: 'database',
    image: 'redis:7-alpine',
    ports: { '6379/tcp': [{ HostPort: '6379' }] },
    env: [],
  },
  {
    id: 'postgres',
    name: 'PostgreSQL',
    description: 'Advanced open-source relational database',
    icon: '🐘',
    category: 'database',
    image: 'postgres:16-alpine',
    ports: { '5432/tcp': [{ HostPort: '5432' }] },
    env: [
      { key: 'POSTGRES_USER', value: 'postgres' },
      { key: 'POSTGRES_PASSWORD', value: 'changeme', description: 'Change this!' },
      { key: 'POSTGRES_DB', value: 'mydb' }
    ],
  },
];

export const CATEGORIES = ['all', 'cms', 'dev', 'media', 'productivity', 'database'] as const;
