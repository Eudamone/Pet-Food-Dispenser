import { networkInterfaces } from 'node:os';
import multicastDns from 'multicast-dns';

const hostname = 'petfeeder.local';
const interfaceName = process.argv[2] || 'Wi-Fi';
const dns = multicastDns();

dns.on('warning', (error) => console.error(error.message));
dns.on('error', (error) => {
  console.error(error.message);
  dns.destroy();
  process.exitCode = 1;
});
dns.on('query', ({ questions }, remote) => {
  if (!questions.some(({ name, type }) =>
    name.toLowerCase().replace(/\.$/, '') === hostname &&
    (type === 'A' || type === 'ANY'))) return;
  const answers = (networkInterfaces()[interfaceName] || [])
    .filter(({ family, internal }) => family === 'IPv4' && !internal)
    .map(({ address }) => ({ name: hostname, type: 'A', data: address, ttl: 30, flush: true }));
  if (answers.length) dns.respond({ answers }, remote.port === 5353 ? undefined : remote);
});
