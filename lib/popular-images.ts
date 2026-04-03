export interface PopularImage {
  name: string;
  tag: string;
  description: string;
  category: string;
}

export const POPULAR_IMAGES: PopularImage[] = [
  // Web Servers
  { name: 'nginx', tag: 'alpine', description: 'Lightweight web server & reverse proxy', category: 'Web Servers' },
  { name: 'httpd', tag: '2-alpine', description: 'Apache HTTP Server', category: 'Web Servers' },
  { name: 'caddy', tag: 'latest', description: 'Modern web server with automatic HTTPS', category: 'Web Servers' },
  // Databases
  { name: 'postgres', tag: '16-alpine', description: 'PostgreSQL relational database', category: 'Databases' },
  { name: 'mysql', tag: '8', description: 'MySQL database server', category: 'Databases' },
  { name: 'redis', tag: '7-alpine', description: 'In-memory data store and cache', category: 'Databases' },
  { name: 'mongo', tag: '7', description: 'NoSQL document database', category: 'Databases' },
  { name: 'mariadb', tag: '11', description: 'MySQL-compatible database', category: 'Databases' },
  // Runtimes
  { name: 'node', tag: '20-alpine', description: 'Node.js JavaScript runtime', category: 'Runtimes' },
  { name: 'python', tag: '3.12-slim', description: 'Python programming language', category: 'Runtimes' },
  { name: 'golang', tag: '1.22-alpine', description: 'Go programming language', category: 'Runtimes' },
  { name: 'ruby', tag: '3.3-slim', description: 'Ruby programming language', category: 'Runtimes' },
  // Operating Systems
  { name: 'ubuntu', tag: '24.04', description: 'Ubuntu Linux base image', category: 'Operating Systems' },
  { name: 'alpine', tag: '3.19', description: 'Minimal 5MB Linux base image', category: 'Operating Systems' },
  { name: 'debian', tag: 'bookworm-slim', description: 'Debian Linux base image', category: 'Operating Systems' },
];

export const POPULAR_CATEGORIES = [...new Set(POPULAR_IMAGES.map(i => i.category))];
