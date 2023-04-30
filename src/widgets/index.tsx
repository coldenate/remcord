import {
  AppEvents,
  declareIndexPlugin,
  PageType,
  ReactRNPlugin,
  Rem,
  RemNamespace,
  useRunAsync,
  WidgetLocation,
  WindowNamespace,
} from '@remnote/plugin-sdk';
import '../App.css';
import { sendPresence } from '../funcs/update_presence';
import { getPluginVersion } from '../funcs/getPluginVersion';
import { getHelperVersion } from '../funcs/getHelperVersion';

const port = 3093;
const DESIRED_VERSIION_HELPER = 'v0.0.6';
let allowedIdleTime = 5; // in minutes
let idleElapsedTime = new Date();
let idleCheck: boolean;
let elapsedTime: Date = new Date();
let elapsedGlobalRemChangeTime: Date | null = null;
let aliveOrNah = { heartbeat: true };
const pluginVersion = getPluginVersion();
let parentRemId: string | undefined = undefined;
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
    .catch((error: Error): void => console.log('error', error));
}

function checkIdle() {
  let tempTime = allowedIdleTime * 60000;

  if (new Date().getTime() - idleElapsedTime.getTime() > tempTime) {
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
    description: "You can use {remName} to show the name of the rem you're editing.",
    defaultValue: 'Editing {remName}',
  });

  await plugin.settings.registerStringSetting({
    id: 'editing-details',
    title: 'What should we show when editing inside of a document?',
    description: "You can use {remName} to show the name of the rem you're editing.",
    defaultValue: 'Editing in {remName}',
  });

  // TODO: simply viewing and not editing
  // await plugin.settings.registerStringSetting({
  //   id: 'viewing-text',
  //   title: 'What should we show when viewing a document?',
  //   description: "You can use {remName} to show the name of the rem you're editing.",
  //   defaultValue: 'Viewing {remName}',
  // });

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

  await plugin.settings.registerBooleanSetting({
    id: 'incognito-mode',
    title: 'Disable display of any details about what you are editing/viewing?',
    description:
      'If you prefer the privacy, turn this on so Discord does not show what you are editing.',
    defaultValue: false,
  });

  await plugin.settings.registerBooleanSetting({
    id: 'show-current-rem-name',
    title: 'Should RemCord show the name of the rem you are editing?',
    description:
      "If you prefer the privacy, turn this off so Discord doesn't show exactly what you are typing. Only the Parent Rem will be shown.",
    defaultValue: false,
  });

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
      justLeftQueue = true;
      // send a post request to the discord gateway saying the user is idle
      setIdle();
    }, 25);
  });

  plugin.event.addListener(AppEvents.GlobalRemChanged, undefined, async (data) => {
    setTimeout(async () => {
      if (elapsedGlobalRemChangeTime === null) {
        elapsedGlobalRemChangeTime = new Date();
      }
      if (new Date().getTime() - elapsedGlobalRemChangeTime.getTime() < 500) return;
      elapsedGlobalRemChangeTime = new Date();
      await setAsEditing(plugin, data);
    }, 25);
  });

  plugin.event.addListener(AppEvents.FocusedRemChange, undefined, async (data) => {
    setTimeout(async () => {
      // update the idleElapsedTime
      // if in queue, return
      let inQueue = await plugin.window.isOnPage(PageType.Queue);

      if (inQueue) return;
      if (justLeftQueue) {
        justLeftQueue = false;
        return;
      }
      await setAsEditing(plugin, data);
    }, 25);
  });

  plugin.track(async (reactivePlugin) => {
    await pullSettings();
  });

  await pullSettings();

  // Show a toast notification to the user.
  await plugin.app.toast(
    `RemCord v${pluginVersion} Loaded!\nRemCord Helper ${await getHelperVersion()}`
  );

  if (Math.floor(Math.random() * 7) === 0) {
    await plugin.app.toast('Fun Fact: You can disable these notifications in settings!');
  }

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

  let currentRemId: string = 'null';

  if (data.prevRemId) {
    currentRemId = data.nextRemId;
  } else if (data.remId) {
    parentRemId = data.old.parent;
    currentRemId = data.remId;
  }

  // const rem = useRunAsync(async () => await plugin.rem.findOne(remId), [remId]);
  const parentRem: Rem | undefined = await plugin.rem.findOne(parentRemId);
  // if the rem is undefined, set remName to "rem". if rem.text is an array, set remName to rem.text[0]. if rem.text is a string, set remName to rem.text
  let parentRemName: string = '{🔄 fetching name}';
  if (parentRem) {
    if (Array.isArray(parentRem.text)) {
      parentRemName = parentRem.text[0];
    } else if (typeof parentRem.text === 'string') {
      parentRemName = parentRem.text;
    }
  }

  const currentRem: Rem | undefined = await plugin.rem.findOne(currentRemId);
  // if the rem is undefined, set remName to "rem". if rem.text is an array, set remName to rem.text[0]. if rem.text is a string, set remName to rem.text
  let currentRemName = '{🔄 fetching name}';
  if (currentRem) {
    if (Array.isArray(currentRem.text)) {
      currentRemName = currentRem.text[0];
    } else if (typeof currentRem.text === 'string') {
      currentRemName = currentRem.text;
    }
  }

  let editingText: string = await plugin.settings.getSetting('editing-text');
  // editing text will could look like this: "Editing: {remName}" if so, replace {remName} with the rem name
  if (editingText.includes('{remName}')) {
    editingText = editingText.replace('{remName}', currentRemName);
  }

  let editingDetails: string = await plugin.settings.getSetting('editing-details');
  // editing details will could look like this: "Editing: {remName}" if so, replace {remName} with the rem name
  if (editingDetails.includes('{remName}')) {
    editingDetails = editingDetails.replace('{remName}', parentRemName);
  }

  sendPresence({
    details: editingDetails,
    largeImageKey: 'mocha_logo',
    largeImageText: `RemCord v${pluginVersion}`,
    smallImageKey: 'transparent_icon_logo',
    // smallImageText: 'Maybe the Daily Goal can go here?',
    startTimestamp: elapsedTime,
    port: port,
  });

  if (await plugin.settings.getSetting('show-current-rem-name')) {
    sendPresence({
      details: editingDetails,
      state: editingText,
      largeImageKey: 'mocha_logo',
      largeImageText: `RemCord v${pluginVersion}`,
      smallImageKey: 'transparent_icon_logo',
      // smallImageText: 'Maybe the Daily Goal can go here?',
      startTimestamp: elapsedTime,
      port: port,
    });
  }
  if (await plugin.settings.getSetting('incognito-mode')) {
    sendPresence({
      state: 'Editing Rems',
      largeImageKey: 'mocha_logo',
      largeImageText: `RemCord v${pluginVersion}`,
      smallImageKey: 'transparent_icon_logo',
      // smallImageText: 'Maybe the Daily Goal can go here?',
      startTimestamp: elapsedTime,
      port: port,
    });
  }
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
