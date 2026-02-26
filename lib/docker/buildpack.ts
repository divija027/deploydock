import fs from 'fs';
import path from 'path';

export type Language = 'node' | 'python' | 'php' | 'static' | 'unknown';

export function detectLanguage(projectPath: string): Language {
  const has = (file: string) => fs.existsSync(path.join(projectPath, file));

  if (has('package.json')) return 'node';
  if (has('requirements.txt') || has('Pipfile') || has('pyproject.toml')) return 'python';
  if (has('composer.json') || has('index.php')) return 'php';
  if (has('index.html')) return 'static';
  return 'unknown';
}

export function generateDockerfile(lang: Language, projectPath: string): string {
  switch (lang) {
    case 'node': {
      const pkg = JSON.parse(fs.readFileSync(path.join(projectPath, 'package.json'), 'utf8'));
      const startCmd = pkg.scripts?.start ?? 'node index.js';
      return `FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
EXPOSE 3000
CMD ["sh", "-c", "${startCmd}"]`;
    }
    case 'python':
      return `FROM python:3.12-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY . .
EXPOSE 8000
CMD ["python", "app.py"]`;

    case 'php':
      return `FROM php:8.3-apache
COPY . /var/www/html/
EXPOSE 80`;

    case 'static':
      return `FROM nginx:alpine
COPY . /usr/share/nginx/html
EXPOSE 80`;

    default:
      throw new Error('Cannot auto-detect language. Please provide a Dockerfile.');
  }
}
