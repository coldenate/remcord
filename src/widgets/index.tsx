import { AppEvents, declareIndexPlugin, ReactRNPlugin, WidgetLocation } from '@remnote/plugin-sdk';
import '../App.css';
import { sendPresence } from '../funcs/update_presence';
import { getPluginVersion } from '../funcs/getPluginVersion';

// import { updateActivity, clientLogin } from './rpc';

const port = 3093;

let elapsedTime = new Date();
let aliveOrNah = { heatbeat: true };
const pluginVersion = getPluginVersion();
function sendHeartbeat() {
  const myHeaders: HeadersInit = new Headers();
  myHeaders.append('Content-Type', 'application/json');

  const raw = JSON.stringify(aliveOrNah);

  const requestOptions: RequestInit = {
    method: 'POST',
    headers: myHeaders,
    body: raw,
    redirect: 'follow',
  };

  fetch(`http://localhost:${port}/heartbeat`, requestOptions)
    .then((response: Response): Promise<string> => response.text())
    .then((result: string): void => console.log(result))
    .catch((error: Error): void => console.log('error', error));
}

async function onActivate(plugin: ReactRNPlugin) {
  await plugin.settings.registerBooleanSetting({
    id: 'idle-check',
    title: 'Should RemCord check for idle?',
    defaultValue: true,
  });

  await plugin.settings.registerStringSetting({
    id: 'editing-text',
    title: 'What should we show when you are editing rems?',
    defaultValue: 'Editing Rems',
  });

  await plugin.settings.registerStringSetting({
    id: 'viewing-text',
    title: 'What should we show when viewing a document?',
    defaultValue: 'Viewing {documentName}',
  });

  await plugin.settings.registerNumberSetting({
    id: 'idle-time',
    title: 'How long should we wait before considering you idle?',
    defaultValue: 300,
  });

  // askuser if they want to show when they are studying their queue
  await plugin.settings.registerBooleanSetting({
    id: 'show-queue',
    title: 'Should RemCord show when you are studying your queue?',
    defaultValue: true,
  });
  // ask user if they want to show their queue statistics
  await plugin.settings.registerBooleanSetting({
    id: 'show-queue-stats',
    title: 'Should RemCord show your queue statistics?',
    defaultValue: true,
  });

  // // A command that inserts text into the editor if focused.
  // await plugin.app.registerCommand({
  //   id: 'discord-connect',
  //   name: 'Connect to Discord Gateway',
  //   action: async () => {},
  // });

  await plugin.app.registerCommand({
    id: 'get-version',
    name: 'Get Plugin Version',
    action: async () => {
      await plugin.app.toast(`RemCord v${pluginVersion}`);
    },
  });
  // Defining listeners
  plugin.event.addListener(AppEvents.QueueEnter, undefined, async (data) => {
    setTimeout(async () => {
      // send a post request to the discord gateway
      sendPresence({
        details: 'Flashcard Queue',
        // state: `num cards left`,
        state: `Studying`,
        largeImageKey: 'mocha_logo',
        largeImageText: `RemCord v${pluginVersion}`,
        smallImageKey: 'transparent_icon_logo',
        // smallImageText: 'Maybe the Daily Goal can go here?',
        startTimestamp: elapsedTime,
        port: port,
      });
    }, 25);
  });

  plugin.event.addListener(AppEvents.QueueExit, undefined, async (data) => {
    setTimeout(async () => {
      // send a post request to the discord gateway saying the user is idle

      sendPresence({
        details: 'Idle',
        state: 'Not Studying',
        largeImageKey: 'mocha_logo',
        largeImageText: `RemCord v${pluginVersion}`,
        smallImageKey: 'transparent_icon_logo',
        // smallImageText: 'Maybe the Daily Goal can go here?',
        startTimestamp: elapsedTime,
        port: port,
      });
    }, 25);
  });

  plugin.event.addListener(AppEvents.EditorTextEdited, undefined, async (data) => {
    setTimeout(async () => {
      // send a post request to the discord gateway saying the user is editing!
      sendPresence({
        details: 'Rem Editor',
        state: await plugin.settings.getSetting('editing-text'),
        largeImageKey: 'mocha_logo',
        largeImageText: `RemCord v${pluginVersion}`,
        smallImageKey: 'transparent_icon_logo',
        // smallImageText: 'Maybe the Daily Goal can go here?',
        startTimestamp: elapsedTime,
        port: port,
      });
    }, 25);
  });

  // plugin.event.addListener(AppEvents.onDeactivate, undefined, async (data) => {
  //   // console log ADJKHFBSDJKHFBSDJKHFBSDJKFHBSD
  //   console.log('wrapping up!');
  //   sendPresence({ destroy: true, port: port });
  // });

  // Show a toast notification to the user.
  await plugin.app.toast('Discord RPC Extension Loaded!');


}

async function onDeactivate(_: ReactRNPlugin) {}

declareIndexPlugin(onActivate, onDeactivate);
export { sendHeartbeat };
