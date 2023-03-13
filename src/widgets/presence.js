import { register, Client } from 'discord-rpc';

const clientId = '1083778386708676728';

register(clientId);

const rpc = new Client({ transport: 'ipc' });

rpc.on('ready', () => {
  console.log('Connected to Discord RPC');

  rpc.setActivity({
    details: 'Playing my JavaScript app',
    state: 'Coding away!',
    largeImageKey: 'image-key',
    largeImageText: 'My JavaScript App',
    startTimestamp: Date.now(),
    instance: true,
  });
});

rpc.login({ clientId }).catch(console.error);

