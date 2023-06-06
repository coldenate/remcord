import {
	AppEvents,
	declareIndexPlugin,
	PageType,
	ReactRNPlugin,
	Rem,
	RemNamespace,
	RNPlugin,
	useRunAsync,
	useSyncedStorageState,
	WidgetLocation,
	WindowNamespace,
} from '@remnote/plugin-sdk';
import '../App.css';
import { sendPresence } from '../funcs/update_presence';
import { getPluginVersion } from '../funcs/getPluginVersion';

const port = 3093;
let allowedIdleTime = 5; // in minutes
let idleElapsedTime = new Date();
let idleCheck: boolean;
let elapsedTime: Date = new Date();
let elapsedGlobalRemChangeTime: Date | null = null;
const pluginVersion = getPluginVersion();
let parentRemId: string | undefined = undefined;
let justLeftQueue: boolean = false;
let cardsRemaining: number | undefined = undefined;

function checkIdle() {
	let tempTime = allowedIdleTime * 60000;

	if (new Date().getTime() - idleElapsedTime.getTime() > tempTime) {
		setIdle();
	}
}

// the below timeout-interval is a hacky trick to make a file run simliarly to a worker thread
setTimeout(() => {
	setInterval(() => {
		checkIdle();
	}, 1000);
}, 25);

async function onActivate(plugin: ReactRNPlugin) {
	cardsRemaining = await plugin.queue.getNumRemainingCards();

	// just testing
	// const [discordUserAuthToken, setDiscordUserAuthToken] = useSyncedStorageState<string>(
	// 	'discordUserAuthToken',
	// 	'0'
	// );

	// console.log('Discord User Auth Token: ' + discordUserAuthToken);

	// setDiscordUserAuthToken('ppeeepeeeseeeee');

	// console.log('Discord User Auth Token: ' + discordUserAuthToken);

	// widgets

	await plugin.app.registerWidget('discordAuth', WidgetLocation.RightSidebar, {
		dimensions: { height: '100%', width: '100%' },
		widgetTabIcon: 'https://raw.githubusercontent.com/coldenate/RemCord/main/public/logo-app.png',
	});

	// settings

	await plugin.settings.registerStringSetting({
		id: 'editing-text',
		title: 'Editing Display Text',
		description: "You can use {remName} to show the name of the rem you're editing.",
		defaultValue: 'Editing {remName}',
	});

	await plugin.settings.registerStringSetting({
		id: 'editing-details',
		title: 'Editing Display Details',
		description: "You can use {remName} to show the name of the rem you're editing.",
		defaultValue: 'Editing in {remName}',
	});

	await plugin.settings.registerStringSetting({
		id: 'studying-queue',
		title: 'Studying Queue Display Text',
		description: 'You can use {cardsRemaining} for the number of cards left in your queue.',
		defaultValue: '{cardsRemaining} cards left!',
	});

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
	// Defining listeners
	plugin.event.addListener(AppEvents.QueueEnter, undefined, async (data) => {
		setTimeout(async () => {
			// update the idleElapsedTime
			idleElapsedTime = new Date();
			// send a post request to the discord gateway
			await setAsQueue(plugin);
		}, 25);
	});

	plugin.event.addListener(AppEvents.QueueCompleteCard, undefined, async (data) => {
		setTimeout(async () => {
			// update the idleElapsedTime
			idleElapsedTime = new Date();
			// send a post request to the discord gateway
			cardsRemaining = await plugin.queue.getNumRemainingCards();
			await setAsQueue(plugin);
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

	async function pullSettings() {
		allowedIdleTime = await plugin.settings.getSetting('idle-time');
		idleCheck = await plugin.settings.getSetting('idle-check');
	}
	setIdle();
}

async function setAsQueue(plugin: ReactRNPlugin) {
	let cardsRemaining: number | any = await plugin.queue.getNumRemainingCards();
	let showQueue: boolean = await plugin.settings.getSetting('show-queue');
	let showQueueStats: boolean = await plugin.settings.getSetting('show-queue-stats');
	let studyingQueueText: string = await plugin.settings.getSetting('studying-queue');

	if (!showQueue) return;

	if (studyingQueueText === '') {
		studyingQueueText = 'Studying Queue';
	}
	studyingQueueText = studyingQueueText.replace('{cardsRemaining}', cardsRemaining.toString());
	if (showQueueStats) {
		sendPresence({
			details: 'Flashcard Queue',
			state: studyingQueueText,
			largeImageKey: 'transparent_icon_logo',
			largeImageText: `RemCord v${pluginVersion}`,
			smallImageKey: 'transparent_icon_logo',
			smallImageText: `Current Streak ${await plugin.queue.getCurrentStreak()}`,
			startTimestamp: elapsedTime,
			port: port,
		});
	} else {
		sendPresence({
			details: 'Flashcard Queue',
			state: studyingQueueText,
			largeImageKey: 'transparent_icon_logo',
			largeImageText: `RemCord v${pluginVersion}`,
			startTimestamp: elapsedTime,
			port: port,
		});
	}
}

async function setAsEditing(plugin: ReactRNPlugin, data?: any) {
	idleElapsedTime = new Date();

	let currentRemId: string = 'null';

	if (data.prevRemId) {
		currentRemId = data.nextRemId;
	} else if (data.remId) {
		parentRemId = data.old.parent;
		currentRemId = data.remId;
	}

	const parentRem: Rem | undefined = await plugin.rem.findOne(parentRemId);

	let parentRemName: string = '{🔄 fetching name}';

	// get the boolean setting 'only-documents'
	const onlyDocuments: boolean = await plugin.settings.getSetting('only-documents');

	if (parentRem) {
		if (Array.isArray(parentRem.text)) {
			parentRemName = parentRem.text[0];
		} else if (typeof parentRem.text === 'string') {
			parentRemName = parentRem.text;
		}
	}

	const currentRem: Rem | undefined = await plugin.rem.findOne(currentRemId);
	let currentRemName = '{🔄 fetching name}';
	if (currentRem) {
		if (Array.isArray(currentRem.text)) {
			currentRemName = currentRem.text[0];
		} else if (typeof currentRem.text === 'string') {
			currentRemName = currentRem.text;
		}
	}

	let editingText: string = await plugin.settings.getSetting('editing-text');
	if (editingText.includes('{remName}')) {
		editingText = editingText.replace('{remName}', currentRemName);
	}

	let editingDetails: string = await plugin.settings.getSetting('editing-details');
	if (editingDetails.includes('{remName}')) {
		editingDetails = editingDetails.replace('{remName}', parentRemName);
	}

	sendPresence({
		details: editingDetails,
		largeImageKey: 'transparent_icon_logo',
		largeImageText: `RemCord v${pluginVersion}`,
		smallImageKey: 'transparent_icon_logo',
		smallImageText: `Study Streak: ${await plugin.queue.getCurrentStreak()}`,
		startTimestamp: elapsedTime,
		port: port,
	});

	if (await plugin.settings.getSetting('show-current-rem-name')) {
		sendPresence({
			details: editingDetails,
			state: editingText,
			largeImageKey: 'transparent_icon_logo',
			largeImageText: `RemCord v${pluginVersion}`,
			smallImageKey: 'transparent_icon_logo',
			smallImageText: `Study Streak: ${await plugin.queue.getCurrentStreak()}`,
			startTimestamp: elapsedTime,
			port: port,
		});
	}
	if (await plugin.settings.getSetting('incognito-mode')) {
		sendPresence({
			state: 'Editing Rems',
			largeImageKey: 'transparent_icon_logo',
			largeImageText: `RemCord v${pluginVersion}`,
			smallImageKey: 'transparent_icon_logo',
			smallImageText: `Study Streak: ${await plugin.queue.getCurrentStreak()}`,
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
		largeImageKey: 'transparent_icon_logo',
		largeImageText: `RemCord v${pluginVersion}`,
		smallImageKey: 'transparent_icon_logo',
		startTimestamp: elapsedTime,
		port: port,
	});
}

async function onDeactivate(_: ReactRNPlugin) {
	console.info('deactivating!');
}

declareIndexPlugin(onActivate, onDeactivate);
