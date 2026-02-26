import Docker from 'dockerode';

const globalForDocker = global as unknown as { docker: Docker };

export const docker =
  globalForDocker.docker ??
  new Docker({ socketPath: '/var/run/docker.sock' });

if (process.env.NODE_ENV !== 'production') globalForDocker.docker = docker;

export default docker;
