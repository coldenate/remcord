import { declareIndexPlugin, ReactRNPlugin, WidgetLocation } from '@remnote/plugin-sdk';
import '../style.css';
import '../App.css';
// import { updateActivity, clientLogin } from './rpc';

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

  // Show a toast notification to the user.
  await plugin.app.toast('Discord RPC Extension Loaded!');

  // // Register a sidebar widget.
  // await plugin.app.registerWidget('sample_widget', WidgetLocation.RightSidebar, {
  //   dimensions: { height: 'auto', width: '100%' },
  // });
}

async function onDeactivate(_: ReactRNPlugin) {}

declareIndexPlugin(onActivate, onDeactivate);
