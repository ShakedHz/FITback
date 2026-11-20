/**
 * HTTPS front door for the phone.
 * iOS only shows the system share sheet (AirDrop, Messages, Mail, …) on a secure page.
 * The Mac keeps using http://localhost:5199. The phone uses https://<lan-ip>:5443.
 */
import { execSync, spawnSync } from 'node:child_process';
import { request as httpRequest } from 'node:http';
import { createServer } from 'node:https';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { networkInterfaces } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const certDir = join(root, '.certs');
export const PHONE_HTTPS_PORT = 5443;

export function lanIps() {
  const ips = new Set();
  try {
    for (const addrs of Object.values(networkInterfaces())) {
      for (const addr of addrs ?? []) {
        if (addr.family === 'IPv4' && !addr.internal) ips.add(addr.address);
      }
    }
  } catch {
    /* sandbox */
  }
  if (ips.size === 0) {
    for (const iface of ['en0', 'bridge100', 'en1']) {
      try {
        const ip = execSync(`ipconfig getifaddr ${iface}`, { encoding: 'utf8' }).trim();
        if (ip) ips.add(ip);
      } catch {
        /* inactive */
      }
    }
  }
  return [...ips];
}

function ensureCert(ips) {
  mkdirSync(certDir, { recursive: true });
  const keyPath = join(certDir, 'dev-key.pem');
  const certPath = join(certDir, 'dev-cert.pem');
  const markerPath = join(certDir, 'sans.txt');
  const marker = ['localhost', '127.0.0.1', ...ips].sort().join('\n');
  if (existsSync(keyPath) && existsSync(certPath) && existsSync(markerPath)) {
    if (readFileSync(markerPath, 'utf8') === marker) {
      return { key: readFileSync(keyPath), cert: readFileSync(certPath) };
    }
  }

  const san = ['DNS:localhost', 'IP:127.0.0.1', ...ips.map((ip) => `IP:${ip}`)].join(',');
  const result = spawnSync(
    'openssl',
    [
      'req',
      '-x509',
      '-newkey',
      'rsa:2048',
      '-sha256',
      '-days',
      '825',
      '-nodes',
      '-keyout',
      keyPath,
      '-out',
      certPath,
      '-subj',
      '/CN=FITback',
      '-addext',
      `subjectAltName=${san}`,
    ],
    { encoding: 'utf8' }
  );
  if (result.status !== 0) {
    throw new Error(result.stderr || result.stdout || 'openssl failed');
  }
  writeFileSync(markerPath, marker);
  return { key: readFileSync(keyPath), cert: readFileSync(certPath) };
}

function headerLines(headers) {
  const lines = [];
  for (const [name, value] of Object.entries(headers)) {
    if (value == null) continue;
    if (Array.isArray(value)) {
      for (const item of value) lines.push(`${name}: ${item}`);
    } else {
      lines.push(`${name}: ${value}`);
    }
  }
  return lines.join('\r\n');
}

export function startPhoneHttps({ targetPort, ips = lanIps(), listenPort = PHONE_HTTPS_PORT } = {}) {
  const { key, cert } = ensureCert(ips);
  const server = createServer({ key, cert }, (req, res) => {
    const proxyReq = httpRequest(
      {
        host: '127.0.0.1',
        port: targetPort,
        method: req.method,
        path: req.url,
        headers: { ...req.headers, host: `127.0.0.1:${targetPort}` },
      },
      (proxyRes) => {
        res.writeHead(proxyRes.statusCode ?? 502, proxyRes.headers);
        proxyRes.pipe(res);
      }
    );
    proxyReq.on('error', () => {
      if (!res.headersSent) res.writeHead(502);
      res.end();
    });
    req.pipe(proxyReq);
  });

  server.on('upgrade', (req, socket, head) => {
    const proxyReq = httpRequest({
      host: '127.0.0.1',
      port: targetPort,
      method: req.method,
      path: req.url,
      headers: req.headers,
    });
    proxyReq.on('upgrade', (proxyRes, proxySocket, proxyHead) => {
      const status = `HTTP/1.1 ${proxyRes.statusCode} ${proxyRes.statusMessage || 'Switching Protocols'}\r\n`;
      socket.write(`${status}${headerLines(proxyRes.headers)}\r\n\r\n`);
      if (proxyHead?.length) socket.write(proxyHead);
      if (head?.length) proxySocket.write(head);
      proxySocket.pipe(socket);
      socket.pipe(proxySocket);
    });
    proxyReq.on('error', () => socket.destroy());
    proxyReq.end();
  });

  server.on('error', (err) => {
    console.error(`[phone-https] ${err.message}`);
  });

  server.listen(listenPort, '0.0.0.0');
  return {
    port: listenPort,
    urls: ips.map((ip) => `https://${ip}:${listenPort}/`),
  };
}

const isDirectRun = process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1];
if (isDirectRun) {
  const targetPort = Number(process.env.FITBACK_APP_PORT || 5199);
  const started = startPhoneHttps({ targetPort });
  if (started.urls.length === 0) {
    console.log(`Phone HTTPS proxy on https://127.0.0.1:${started.port}/ (no LAN IP)`);
  } else {
    console.log('Phone share sheet — open this in Safari and accept the certificate once:\n');
    for (const url of started.urls) console.log(`   → ${url}`);
    console.log('');
  }
}
