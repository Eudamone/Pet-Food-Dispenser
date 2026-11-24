import { networkInterfaces } from 'node:os';
import { createSocket } from 'node:dgram';
import multicastDns from 'multicast-dns';

const hostname = 'petfeeder.local';
const interfaceName = process.argv[2] || 'Wi-Fi';
const socket = createSocket({ type: 'udp4', reuseAddr: true });
const dns = multicastDns({ socket });

function ipv4(value) {
  return value.split('.').reduce((number, part) => (number << 8) | Number(part), 0);
}

dns.on('warning', (error) => console.error(error.message));
dns.on('error', (error) => {
  console.error(error.message);
  dns.destroy();
  process.exitCode = 1;
});
dns.on('query', ({ id, questions }, remote) => {
  if (!questions.some(({ name, type }) =>
    name.toLowerCase().replace(/\.$/, '') === hostname &&
    (type === 'A' || type === 'ANY'))) return;
  const interfaces = networkInterfaces();
  const localAddresses = Object.values(interfaces).flat()
    .filter(({ family, internal }) => family === 'IPv4' && !internal);
  const local = localAddresses.find(({ address, netmask }) =>
    (ipv4(address) & ipv4(netmask)) === (ipv4(remote.address) & ipv4(netmask))) ??
    interfaces[interfaceName]?.find(({ family }) => family === 'IPv4');
  if (!local) return;
  const multicast = remote.port === 5353;
  const answers = [{ name: hostname, type: 'A', data: local.address,
    ttl: multicast ? 30 : 10, flush: multicast }];
  if (multicast) {
    socket.setMulticastInterface(local.address);
    dns.respond({ answers });
  } else {
    dns.respond({ id, questions, answers }, remote);
  }
});
