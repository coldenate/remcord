import { AppEvents, declareIndexPlugin, ReactRNPlugin, WidgetLocation } from '@remnote/plugin-sdk';
import '../style.css';
import '../App.css';
// import { updateActivity, clientLogin } from './rpc';

const port = 3093;

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

  // A command that inserts text into the editor if focused.
  await plugin.app.registerCommand({
    id: 'discord-connect',
    name: 'Connect to Discord Gateway',
    action: async () => {},
  });

  // Defining listeners

  plugin.event.addListener(AppEvents.QueueCompleteCard, undefined, async (data) => {
    setTimeout(async () => {
      // send a post request to the discord gateway
      console.log('Queue Is Begin');
      const myHeaders: HeadersInit = new Headers();
      myHeaders.append('Content-Type', 'application/json');

      const raw = JSON.stringify({
        details: 'RemNote',
        state: 'Studying in Queue',
        largeImageKey: 'mocha_logo',
        largeImageText: 'RemNote',
        smallImageKey: 'transparent_icon_logo',
        smallImageText: 'RemNote',
      });

      const requestOptions: RequestInit = {
        method: 'POST',
        headers: myHeaders,
        body: raw,
        redirect: 'follow',
      };

      fetch(`http://localhost:${port}/activity`, requestOptions)
        .then((response: Response): Promise<string> => response.text())
        .then((result: string): void => console.log(result))
        .catch((error: Error): void => console.log('error', error));
    }, 25);
  });

  // Show a toast notification to the user.
  await plugin.app.toast('Discord RPC Extension Loaded!');

  // // Register a sidebar widget.
  // await plugin.app.registerWidget('sample_widget', WidgetLocation.RightSidebar, {
  //   dimensions: { height: 'auto', width: '100%' },
  // });
}

async function onDeactivate(_: ReactRNPlugin) {}

declareIndexPlugin(onActivate, onDeactivate);
