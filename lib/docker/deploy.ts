import path from 'path';
import fs from 'fs';
import simpleGit from 'simple-git';
import docker from '@/lib/docker/client';
import { prisma } from '@/lib/prisma';
import { detectLanguage, generateDockerfile } from './buildpack';

interface DeployOptions {
  appName: string;
  repoUrl: string;
  imageTag: string;
  deploymentId: string;
}

const DEPLOY_BASE = '/tmp/ddd-deploys';

export async function buildAndDeploy(opts: DeployOptions): Promise<void> {
  const { appName, repoUrl, imageTag, deploymentId } = opts;
  const repoPath = path.join(DEPLOY_BASE, appName);

  const appendLog = async (text: string) => {
    const current = await prisma.deployment.findUnique({
      where: { id: deploymentId },
      select: { logs: true }
    });
    await prisma.deployment.update({
      where: { id: deploymentId },
      data: { logs: (current?.logs ?? '') + text + '\n' }
    });
  };

  try {
    await appendLog('[1/4] Fetching repository...');
    if (fs.existsSync(repoPath)) {
      await simpleGit(repoPath).pull();
    } else {
      fs.mkdirSync(repoPath, { recursive: true });
      await simpleGit().clone(repoUrl, repoPath);
    }
    await appendLog('Repository ready.');

    await appendLog('[2/4] Preparing Dockerfile...');
    const dockerfilePath = path.join(repoPath, 'Dockerfile');
    if (!fs.existsSync(dockerfilePath)) {
      const lang = detectLanguage(repoPath);
      const dockerfile = generateDockerfile(lang, repoPath);
      fs.writeFileSync(dockerfilePath, dockerfile);
      await appendLog(`Auto-generated Dockerfile for ${lang} project.`);
    } else {
      await appendLog('Using existing Dockerfile.');
    }

    await appendLog('[3/4] Building Docker image...');
    const buildStream = await docker.buildImage(
      { context: repoPath, src: ['.'] },
      { t: imageTag }
    );

    await new Promise<void>((resolve, reject) => {
      docker.modem.followProgress(
        buildStream,
        async (err: any, _output: any) => {
          if (err) { await appendLog(`Build error: ${err.message}`); reject(err); }
          else { await appendLog('Image built successfully.'); resolve(); }
        },
        async (event: any) => {
          if (event.stream) await appendLog(event.stream.trim());
          if (event.error) await appendLog(`ERROR: ${event.error}`);
        }
      );
    });

    await appendLog('[4/4] Deploying container...');
    const containerName = appName;

    try {
      const old = docker.getContainer(containerName);
      await old.stop({ t: 10 });
      await old.remove();
      await appendLog(`Removed old container: ${containerName}`);
    } catch {
      // Container didn't exist
    }

    const config = await prisma.appConfig.findUnique({ where: { appName } });
    const hostPort = config?.port?.toString() ?? '';

    const container = await docker.createContainer({
      Image: imageTag,
      name: containerName,
      Env: config?.envVars ? JSON.parse(config.envVars).map((kv: any) => `${kv.key}=${kv.value}`) : [],
      HostConfig: {
        PortBindings: hostPort ? { '3000/tcp': [{ HostPort: hostPort }] } : {},
        RestartPolicy: { Name: 'unless-stopped' },
      },
    });
    await container.start();
    await appendLog(`Container started: ${containerName}`);

    await prisma.deployment.update({
      where: { id: deploymentId },
      data: { status: 'success' }
    });
  } catch (err: any) {
    const current = await prisma.deployment.findUnique({
      where: { id: deploymentId },
      select: { logs: true }
    });
    await prisma.deployment.update({
      where: { id: deploymentId },
      data: {
        status: 'failed',
        logs: (current?.logs ?? '') + `\nFATAL: ${err.message}`
      }
    });
    throw err;
  }
}
