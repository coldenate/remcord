import {
	AppEvents,
	Card,
	declareIndexPlugin,
	PageType,
	ReactRNPlugin,
	Rem,
	RNPlugin,
	WidgetLocation,
} from '@remnote/plugin-sdk';
import '../App.css';
import { getPluginVersion } from '../funcs/getPluginVersion';
import { setAsEditing, setAsQueue, setIdle } from '../funcs/setPresence';
import {
	deleteSessionOnRemote,
	getUserToken,
	refreshUserToken,
	sendHeartbeat,
	setActivity,
} from '../funcs/sessions';
import { getPossibleRPCVariables } from '../funcs/getRPCSetting';
import { Activity } from '../utils/interfaces';
import { DEBUGMODE } from '../utils/constants';

let elapsedGlobalRemChangeTime: Date | null = null;
let justLeftQueue: boolean = false;
let PLUGIN_PASSTHROUGH_VAR: ReactRNPlugin;
export let idleElapsedTime = new Date();
export let elapsedTime: Date = new Date();
export const pluginVersion = getPluginVersion();
export let parentRemId: string | undefined = undefined;
export let clearToRun: boolean = false;
export let lastPresenceUpdate: Date = new Date();

/**
 * Checks if the user has been idle for a certain amount of time and sets the user's presence accordingly.
 */
async function checkIdle() {
	const plugin = PLUGIN_PASSTHROUGH_VAR;
	const allowedIdleTime = (await plugin.settings.getSetting<number>('idle-time')) ?? 5;
	const tempTime = allowedIdleTime * 60000;

	if (new Date().getTime() - idleElapsedTime.getTime() > tempTime) {
		const idleCheck = await plugin.settings.getSetting<boolean>('idle-check');
		setIdle(plugin, idleCheck, clearToRun);
	}
}

/**
 * Checks if the elapsed time since the last presence update is greater than 17 minutes and updates the user's presence accordingly.
 * @returns {Promise<void>} A Promise that resolves when the function finishes executing.
 */
async function avoidExpire() {
	const plugin = PLUGIN_PASSTHROUGH_VAR;
	const elapsedMinutes = (new Date().getTime() - lastPresenceUpdate.getTime()) / 60000;
	if (elapsedMinutes > 17) {
		const currentActivity: Activity | undefined = await plugin.storage.getSynced<Activity>(
			'activity'
		);
		if (!currentActivity) return;
		await setActivity(plugin, clearToRun, currentActivity, false, true);
		lastPresenceUpdate = new Date();
	}
}

// hacky trick for func run scheduled as a job.
setTimeout(() => {
	setInterval(() => {
		checkIdle();
	}, 1000);
}, 25);

setTimeout(() => {
	setInterval(() => {
		avoidExpire();
	}, 1000);
}, 25);

setTimeout(() => {
	setInterval(() => {
		sendHeartbeat(PLUGIN_PASSTHROUGH_VAR);
	}, 7000);
}, 25);

/**
 * Function that is called when the plugin is activated.
 * @param plugin - The plugin object.
 */
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
	} else if (new Date().getTime() - lastRefreshTime.getTime() < 432000000) {
		clearToRun = true;
	}

	// widgets

	await plugin.app.registerWidget('discordAuth', WidgetLocation.Pane, {
		dimensions: { height: 'auto', width: '100%' },
		widgetTabIcon: 'https://raw.githubusercontent.com/coldenate/RemCord/main/public/logo-rn.png',
	});
	await plugin.app.registerWidget('discordAuth', WidgetLocation.RightSidebar, {
		dimensions: { height: 'auto', width: '100%' },
		widgetTabIcon: 'https://raw.githubusercontent.com/coldenate/RemCord/main/public/logo-rn.png',
	});

	// rpc settings

	const VARIABLE_NOTICE_STRING: string =
		'Variables are in curly brackets. Possible variables are: ' +
		(await getPossibleRPCVariables(plugin));

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

	await plugin.settings.registerBooleanSetting({
		id: 'notifs',
		title: 'Plugin Notifications',
		defaultValue: true,
	});

	// askuser if they want to show when they are studying their queue
	await plugin.settings.registerBooleanSetting({
		id: 'show-queue',
		title: 'Display when using Queue',
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
		id: 'link-discord',
		name: 'Link Discord Account for RemNote Discord RPC',
		description:
			'Link your Discord account to RemNote so that you can display your RemNote status on Discord.',
		action: async () => {
			await plugin.window.openWidgetInPane('discordAuth');
		},
	});

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
			await setAsQueue(plugin, clearToRun, undefined);
		},
	});

	await plugin.app.registerCommand({
		id: 'debug-set-editing',
		name: 'Debug Set RPC as Editing',
		description: 'Debugging command to set the RPC as editing',
		action: async () => {
			await setAsEditing(plugin, clearToRun, undefined);
		},
	});

	await plugin.app.registerCommand({
		id: 'debug-set-idle',
		name: 'Debug Set RPC as Idle',
		description: 'Debugging command to set the RPC as idle',
		action: async () => {
			await setIdle(plugin, idleCheck, clearToRun);
		},
	});

	<----- Uncomment those Debug commands to use them ----->

	*/

	// Defining listeners
	plugin.event.addListener(AppEvents.QueueLoadCard, undefined, async (data) => {
		idleElapsedTime = new Date();
		const card: Card | undefined = await plugin.card.findOne(data.cardId);
		if (card == null || card == undefined) return;
		setAsQueue(plugin, clearToRun, card);
	});

	plugin.event.addListener(AppEvents.QueueExit, undefined, async (data) => {
		idleElapsedTime = new Date();
		await setIdle(plugin, idleCheck, clearToRun);
	});

	plugin.event.addListener(AppEvents.GlobalOpenRem, undefined, async (data) => {
		idleElapsedTime = new Date();
		// data is a rem id
		const rem: Rem | undefined = await plugin.rem.findOne(data.remId);
		if (rem == null || rem == undefined) return;
		setAsEditing(plugin, clearToRun, rem);
	});

	const idleCheck = await plugin.settings.getSetting<boolean>('idle-check');
	setTimeout(async () => {
		if (DEBUGMODE) return;
		setIdle(plugin, idleCheck, clearToRun);
	}, 2500);
}

/**
 * This function is called when the plugin is deactivated.
 * It sets the activity of the plugin to idle and clears the `clearToRun` flag.
 * @param plugin - The plugin instance.
 */
async function onDeactivate(plugin: ReactRNPlugin) {
	await setActivity(plugin, clearToRun, undefined, true, true);
}

declareIndexPlugin(onActivate, onDeactivate);
