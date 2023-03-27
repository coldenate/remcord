import { AppEvents, declareIndexPlugin, ReactRNPlugin, WidgetLocation } from '@remnote/plugin-sdk';
import '../App.css';
import { sendPresence } from '../funcs/update_presence';
import { getPluginVersion } from '../funcs/getPluginVersion';
import { getHelperVersion } from '../funcs/getHelperVersion';

const port = 3093;
const DESIRED_VERSIION_HELPER = 'v0.0.6';
let allowedIdleTime = 5; // in minutes
let idleElapsedTime = new Date();
let idleCheck: boolean;
let elapsedTime = new Date();
let aliveOrNah = { heartbeat: true };
const pluginVersion = getPluginVersion();
let inQueue: boolean = false;
let justLeftQueue: boolean = false;

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
    // .then((result: string): void => console.log(result))
    .catch((error: Error): void => console.log('error', error));
}

function checkIdle() {
  // check if the idleElapsed is greater than the plugin.settings idle-time
  // get the idle-time by calling it from the plugin.settings
  // if it is, then set the activity to idle

  // convert allowedIdleTime to milliseconds from minutes
  let tempTime = allowedIdleTime * 60000;

  // we'll need to convert the number of minutes to milliseconds
  // if idleElapsedTime is greater than 5 minutes
  if (new Date().getTime() - idleElapsedTime.getTime() > tempTime) {
    // set the activity to idle
    setIdle();
  }
}

// the below timeout-interval is a hacky trick to make a file run simliarly to a worker thread
setTimeout(() => {
  setInterval(() => {
    sendHeartbeat();
  }, 5000);
}, 25);

setTimeout(() => {
  setInterval(() => {
    checkIdle();
  }, 1000);
}, 25);

async function onActivate(plugin: ReactRNPlugin) {
  // send a heartbeat forcefully, and set the activity to idle (future TODO: doing nothing)

  await plugin.settings.registerStringSetting({
    id: 'editing-text',
    title: 'What should we show when you are editing rems?',
    defaultValue: 'Editing Rems',
  });

  // await plugin.settings.registerStringSetting({
  //   id: 'viewing-text',
  //   title: 'What should we show when viewing a document?',
  //   defaultValue: 'Viewing {documentName}',
  // });

  // // askuser if they want to show when they are studying their queue
  // await plugin.settings.registerBooleanSetting({
  //   id: 'show-queue',
  //   title: 'Should RemCord show when you are studying your queue?',
  //   defaultValue: true,
  // });
  // // ask user if they want to show their queue statistics
  // await plugin.settings.registerBooleanSetting({
  //   id: 'show-queue-stats',
  //   title: 'Should RemCord show your queue statistics?',
  //   defaultValue: true,
  // });
  await plugin.settings.registerBooleanSetting({
    id: 'idle-check',
    title: 'Should RemCord check for idle?',
    defaultValue: true,
  });

  await plugin.settings.registerNumberSetting({
    id: 'idle-time',
    title: 'How long should we wait before considering you idle?',
    description: 'In minutes. Default is 5 minutes.',
    defaultValue: 5,
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
      inQueue = true;
      // update the idleElapsedTime
      idleElapsedTime = new Date();
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

  plugin.event.addListener(AppEvents.QueueCompleteCard, undefined, async (data) => {
    setTimeout(async () => {
      // update the idleElapsedTime
      idleElapsedTime = new Date();
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
      inQueue = false;
      justLeftQueue = true;
      // send a post request to the discord gateway saying the user is idle
      setIdle();
    }, 25);
  });

  plugin.event.addListener(AppEvents.EditorTextEdited, undefined, async (data) => {
    setTimeout(async () => {
      // update the idleElapsedTime
      await setAsEditing(plugin, data);
    }, 25);
  });

  plugin.event.addListener(AppEvents.FocusedRemChange, undefined, async (data) => {
    setTimeout(async () => {
      // update the idleElapsedTime
      // if in queue, return
      if (inQueue) return;
      if (justLeftQueue) {
        justLeftQueue = false;
        return;
      }
      await setAsEditing(plugin, data);
    }, 25);
  });

  plugin.event.addListener(AppEvents.SettingChanged, undefined, async (data) => {
    setTimeout(async () => {
      await pullSettings();
    }, 25);
  });

  // plugin.event.addListener(AppEvents.onDeactivate, undefined, async (data) => {
  //   // console log ADJKHFBSDJKHFBSDJKHFBSDJKFHBSD
  //   console.log('wrapping up!');
  //   sendPresence({ destroy: true, port: port });
  // });

  // pull settings from the plugin

  await pullSettings();

  // Show a toast notification to the user.
  await plugin.app.toast(
    `RemCord v${pluginVersion} Loaded!\nRemCord Helper ${await getHelperVersion()}`
  );
  if ((await getHelperVersion()) !== DESIRED_VERSIION_HELPER) {
    await plugin.app.toast(
      `RemCord Helper is out of date! Please update to ${DESIRED_VERSIION_HELPER}\nVisit the Github. Delete the old helper. \nDownload the New One!`
    );
  }

  async function pullSettings() {
    allowedIdleTime = await plugin.settings.getSetting('idle-time');
    idleCheck = await plugin.settings.getSetting('idle-check');
  }
  sendHeartbeat();
  setIdle();
}

async function setAsEditing(plugin: ReactRNPlugin, data?: any) {
  idleElapsedTime = new Date();
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
}

function setIdle() {
  if (!idleCheck) {
    return;
  }
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
}

async function onDeactivate(_: ReactRNPlugin) {
  console.log('deactivating!');
}

declareIndexPlugin(onActivate, onDeactivate);

export { sendHeartbeat };
