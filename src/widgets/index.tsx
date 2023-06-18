import {
	AppEvents,
	declareIndexPlugin,
	PageType,
	ReactRNPlugin,
	WidgetLocation,
} from '@remnote/plugin-sdk';
import '../App.css';
import { getPluginVersion } from '../funcs/getPluginVersion';
import { setAsEditing, setAsQueue, setIdle } from '../funcs/presenceSet';
import {
	deleteSessionOnRemote,
	getUserToken,
	refreshUserToken,
	setActivity,
} from '../funcs/sessions';

let elapsedGlobalRemChangeTime: Date | null = null;
let justLeftQueue: boolean = false;
let PLUGIN_PASSTHROUGH_VAR: ReactRNPlugin;
export let idleElapsedTime = new Date();
export let elapsedTime: Date = new Date();
export const pluginVersion = getPluginVersion();
export let parentRemId: string | undefined = undefined;
export let clearToRun: boolean = false;
export const backendURL = 'http://0.0.0.0:5032';

export const LARGE_IMAGE_QUEUE_URL: string =
	'https://raw.githubusercontent.com/coldenate/RemCord/main/public/logo-rn.png'; // TODO: Create actual logo
export const LARGE_IMAGE_IDLE_URL: string =
	'https://raw.githubusercontent.com/coldenate/RemCord/main/public/logo-rn.png'; // TODO: Create actual logo
export const LARGE_IMAGE_EDITING_URL: string =
	'https://raw.githubusercontent.com/coldenate/RemCord/main/public/logo-rn.pngpng'; // TODO: Create actual logo
export const SMALL_IMAGE_URL: string =
	'https://raw.githubusercontent.com/coldenate/RemCord/main/public/logo-rn.png';

async function checkIdle() {
	const plugin = PLUGIN_PASSTHROUGH_VAR;
	const allowedIdleTime = (await plugin.settings.getSetting<number>('idle-time')) ?? 5;
	const tempTime = allowedIdleTime * 60000;

	if (new Date().getTime() - idleElapsedTime.getTime() > tempTime) {
		const idleCheck = await plugin.settings.getSetting<boolean>('idle-check');
		setIdle(plugin, idleCheck, clearToRun);
	}
}

// hacky trick for func run scheduled as a job. TODO: find a better way to do this
setTimeout(() => {
	setInterval(() => {
		checkIdle();
	}, 1000);
}, 25);

async function onActivate(plugin: ReactRNPlugin) {
	PLUGIN_PASSTHROUGH_VAR = plugin;

	// jobs

	const lastRefreshTime = new Date(
		(await plugin.storage.getSynced<Date>('lastTokenRefreshTime')) || Date.now()
	);
	if (lastRefreshTime === undefined || lastRefreshTime === null) {
		await plugin.storage.setSynced('lastTokenRefreshTime', new Date().getTime()); // we don't need to get the token on the initialization because the user would have to have logged in already
		clearToRun = true;
	} else if (new Date().getTime() - lastRefreshTime.getTime() > 432000000) {
		// 5 days
		refreshUserToken(plugin);
		clearToRun = true;
	}

	// widgets

	await plugin.app.registerWidget('discordAuth', WidgetLocation.RightSidebar, {
		dimensions: { height: '100%' as 'auto', width: '100%' },
		widgetTabIcon: 'https://raw.githubusercontent.com/coldenate/RemCord/main/public/logo-rn.png',
	});

	const VARIABLE_NOTICE_STRING: string = 'Variables are in curly brackets. Possible variables are:';

	await plugin.settings.registerStringSetting({
		id: 'app-name',
		title: 'App Name',
		description: 'The display name of the app. ' + VARIABLE_NOTICE_STRING,
		defaultValue: 'RemNote',
	});

	await plugin.settings.registerStringSetting({
		id: 'queue-details',
		title: 'Queue Details',
		description:
			'The details to display when the user is studying their queue. ' + VARIABLE_NOTICE_STRING,
		defaultValue: '{cardsRemaining} cards remaining!',
	});

	await plugin.settings.registerStringSetting({
		id: 'queue-state',
		title: 'Queue State',
		description:
			'The state to display when the user is studying their queue. ' + VARIABLE_NOTICE_STRING,
		defaultValue: 'Flashcard Queue',
	});

	await plugin.settings.registerStringSetting({
		id: 'queue-large-text',
		title: 'Queue Large Text',
		description:
			'Text for the large image when the user is studying their queue. ' + VARIABLE_NOTICE_STRING,
		defaultValue: 'Study Streak: {currentStreak}',
	});

	await plugin.settings.registerStringSetting({
		id: 'queue-small-text',
		title: 'Queue Small Text',
		description:
			'Text for the small image when the user is studying their queue. ' + VARIABLE_NOTICE_STRING,
		defaultValue: 'RemCord v{pluginVersion}',
	});

	await plugin.settings.registerStringSetting({
		id: 'editing-details',
		title: 'Editing Details',
		description: 'The details to display when the user is editing a rem. ' + VARIABLE_NOTICE_STRING,
		defaultValue: 'Editing a Rem',
	});

	await plugin.settings.registerStringSetting({
		id: 'editing-state',
		title: 'Editing State',
		description: 'The state to display when the user is editing a rem. ' + VARIABLE_NOTICE_STRING,
		defaultValue: 'RemNote Editor',
	});

	await plugin.settings.registerStringSetting({
		id: 'editing-large-text',
		title: 'Editing Large Text',
		description:
			'Text for the large image when the user is editing a rem. ' + VARIABLE_NOTICE_STRING,
		defaultValue: 'RemCord v{pluginVersion}',
	});

	await plugin.settings.registerStringSetting({
		id: 'editing-small-text',
		title: 'Editing Small Text',
		description:
			'Text for the small image when the user is editing a rem. ' + VARIABLE_NOTICE_STRING,
		defaultValue: '{elapsedTime}',
	});

	await plugin.settings.registerStringSetting({
		id: 'idle-details',
		title: 'Idle Details',
		description: 'The details to display when the user is idle. ' + VARIABLE_NOTICE_STRING,
		defaultValue: 'Currently Idling',
	});

	await plugin.settings.registerStringSetting({
		id: 'idle-state',
		title: 'Idle State',
		description: 'The state to display when the user is idle. ' + VARIABLE_NOTICE_STRING,
		defaultValue: 'Idle',
	});

	await plugin.settings.registerStringSetting({
		id: 'idle-large-text',
		title: 'Idle Large Text',
		description: 'Text for the large image when the user is idle. ' + VARIABLE_NOTICE_STRING,
		defaultValue: 'RemCord v{pluginVersion}',
	});

	await plugin.settings.registerStringSetting({
		id: 'idle-small-text',
		title: 'Idle Small Text',
		description: 'Text for the small image when the user is idle. ' + VARIABLE_NOTICE_STRING,
		defaultValue: '{elapsedTime}',
	});

	// settings

	// askuser if they want to show when they are studying their queue
	await plugin.settings.registerBooleanSetting({
		id: 'show-queue',
		title: 'Display when using Queue',
		defaultValue: true,
	});
	// ask user if they want to show their queue statistics
	await plugin.settings.registerBooleanSetting({
		id: 'show-queue-stats',
		title: 'Display Queue Statistics',
		defaultValue: true,
	});

	await plugin.settings.registerBooleanSetting({
		id: 'incognito-mode',
		title: 'Disable Display of Details',
		description:
			'If you prefer the privacy, turn this on so Discord does not show what you are editing.',
		defaultValue: false,
	});

	await plugin.settings.registerBooleanSetting({
		id: 'show-current-rem-name',
		title: 'Show Current Rem Name',
		description:
			"If you prefer the privacy, turn this off so Discord doesn't show exactly what you are typing. Only the Parent Rem will be shown.",
		defaultValue: false,
	});

	await plugin.settings.registerBooleanSetting({
		id: 'notifs',
		title: 'Plugin Notifications',
		defaultValue: true,
	});

	await plugin.settings.registerBooleanSetting({
		id: 'idle-check',
		title: 'Enable Idle',
		defaultValue: true,
	});

	await plugin.settings.registerNumberSetting({
		id: 'idle-time',
		title: 'Maximum Idle Time',
		description: 'In minutes. Default is 5 minutes.',
		defaultValue: 5,
	});

	await plugin.settings.registerBooleanSetting({
		id: 'only-documents',
		title: 'Restrict Display to Documents at Root',
		description:
			"This means whenever a rem you are editing has a root parent that is a document, it will show. Otherwise, RemCord won't display it at all.",
		defaultValue: false,
	});

	// commands

	await plugin.app.registerCommand({
		id: 'force-delete-session',
		name: '{Debug} Force Delete Session',
		description:
			"Force delete the session on the remote server. Please be careful when using this. Do not use this unless you know what you're doing.",
		action: async () => {
			await deleteSessionOnRemote(plugin, clearToRun);
		},
	});

	await plugin.app.registerCommand({
		id: 'force-refresh-token',
		name: '{Debug} Force Refresh Token',
		description:
			"Force refresh the token on the remote server. Please be careful when using this. Do not use this unless you know what you're doing.",
		action: async () => {
			await refreshUserToken(plugin);
		},
	});

	await plugin.app.registerCommand({
		id: 'log-token',
		name: '{Debug} Log Token',
		description:
			"Log the token to the console. Please be careful when using this. Do not use this unless you know what you're doing.",
		action: async () => {
			const tokenToLog = await getUserToken(plugin);
			console.log('Hey there! You logged this TOKEN from that RemNote command:', tokenToLog);
		},
	});

	/*

	<----- Uncomment these Debug commands to use them ----->


	await plugin.app.registerCommand({
		id: 'debug-set-queue',
		name: 'Debug Set RPC as Queue',
		description: 'Debugging command to set the RPC as queue',
		action: async () => {
			await setAsQueue(plugin);
		},
	});

	await plugin.app.registerCommand({
		id: 'debug-set-editing',
		name: 'Debug Set RPC as Editing',
		description: 'Debugging command to set the RPC as editing',
		action: async () => {
			await setAsEditing(plugin);
		},
	});


	await plugin.app.registerCommand({
		id: 'debug-set-idle',
		name: 'Debug Set RPC as Idle',
		description: 'Debugging command to set the RPC as idle',
		action: async () => {
			await setIdle(plugin, idleCheck);
		},
	});

	*/

	// // Defining listeners
	// plugin.event.addListener(AppEvents.QueueEnter, undefined, async (data) => {
	// 	setTimeout(async () => {
	// 		idleElapsedTime = new Date();
	// 		await setAsQueue(plugin);
	// 	}, 25);
	// });

	// plugin.event.addListener(AppEvents.QueueCompleteCard, undefined, async (data) => {
	// 	setTimeout(async () => {
	// 		idleElapsedTime = new Date();
	// 		await setAsQueue(plugin);
	// 	}, 25);
	// });

	// plugin.event.addListener(AppEvents.QueueExit, undefined, async (data) => {
	// 	setTimeout(async () => {
	// 		justLeftQueue = true;
	// 	}, 25);
	// });

	// plugin.event.addListener(AppEvents.GlobalRemChanged, undefined, async (data) => {
	// 	setTimeout(async () => {
	// 		if (elapsedGlobalRemChangeTime === null) {
	// 			elapsedGlobalRemChangeTime = new Date();
	// 		}
	// 		if (new Date().getTime() - elapsedGlobalRemChangeTime.getTime() < 500) return;
	// 		elapsedGlobalRemChangeTime = new Date();
	// 		await setAsEditing(plugin, data);
	// 	}, 25);
	// });

	// plugin.event.addListener(AppEvents.FocusedRemChange, undefined, async (data) => {
	// 	setTimeout(async () => {
	// 		let inQueue = await plugin.window.isOnPage(PageType.Queue);

	// 		if (inQueue) return;
	// 		if (justLeftQueue) {
	// 			justLeftQueue = false;
	// 			return;
	// 		}
	// 		await setAsEditing(plugin, data);
	// 	}, 25);
	// });

	plugin.track(async (reactivePlugin) => {
		// TODO: on setting changes, delete all sessions, and then set the new settings
	});

	const idleCheck = await plugin.settings.getSetting<boolean>('idle-check');
	setIdle(plugin, idleCheck, clearToRun);
}

async function onDeactivate(plugin: ReactRNPlugin) {
	await setActivity(plugin, clearToRun, undefined, true);
}

declareIndexPlugin(onActivate, onDeactivate);
