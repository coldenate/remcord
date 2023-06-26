import { Card, ReactRNPlugin, Rem } from '@remnote/plugin-sdk';
import { getRPCSetting } from './getRPCSetting';
import { setActivity } from './sessions';
import { getPlatform } from './getPlatform';
import {
	LARGE_IMAGE_EDITING_URL,
	SMALL_IMAGE_URL,
	LARGE_IMAGE_QUEUE_URL,
	LARGE_IMAGE_IDLE_URL,
} from '../utils/constants';

let parentRemId: string = 'null';

/**
 * Sets the user's Discord presence to "Editing" and updates the activity details.
 * @param plugin - The RemNote plugin instance.
 * @param clearToRun - A boolean indicating whether the plugin is authorized to run.
 * @param newRem - The new Rem being edited.
 * @param prevRem - The previous Rem being edited.
 * @param idleElapsedTime - The elapsed time since the user was last active.
 * @returns The elapsed time since the user was last active.
 */
export async function setAsEditing(
	plugin: ReactRNPlugin,
	clearToRun: boolean,
	newRem: Rem | undefined,
	prevRem?: Rem,
	idleElapsedTime?: Date
) {
	idleElapsedTime = new Date();

	// get the boolean setting 'only-documents'
	const onlyDocuments: boolean = await plugin.settings.getSetting('only-documents');

	let incognito: boolean;
	incognito = await plugin.settings.getSetting('incognito-mode');

	if (incognito || newRem === undefined) {
		setActivity(plugin, clearToRun, {
			type: 0,
			application_id: '1083778386708676728',
			name: await getRPCSetting('app-name', plugin, undefined),
			details: await getRPCSetting('editing-details', plugin, undefined),
			state: await getRPCSetting('editing-state', plugin, undefined),
			assets: {
				large_image: LARGE_IMAGE_EDITING_URL,
				large_text: await getRPCSetting('editing-large-text', plugin, undefined),
				small_image: SMALL_IMAGE_URL,
				small_text: await getRPCSetting('editing-small-text', plugin, undefined),
			},
			platform: await getPlatform(plugin),
		});
		return idleElapsedTime;
	}

	// rewrite to new format:
	setActivity(plugin, clearToRun, {
		type: 0,
		application_id: '1083778386708676728',
		name: await getRPCSetting('app-name', plugin, newRem),
		details: await getRPCSetting('editing-details', plugin, newRem),
		state: await getRPCSetting('editing-state', plugin, newRem),
		assets: {
			large_image: LARGE_IMAGE_EDITING_URL,
			large_text: await getRPCSetting('editing-large-text', plugin, newRem),
			small_image: SMALL_IMAGE_URL,
			small_text: await getRPCSetting('editing-small-text', plugin, newRem),
		},
		platform: await getPlatform(plugin),
	});

	return idleElapsedTime;
}

/**
 * Sets the user's Discord presence to "In Queue" and updates the activity details.
 * @param plugin - The RemNote plugin instance.
 * @param clearToRun - A boolean indicating whether the plugin is authorized to run.
 * @param card - The current card being processed.
 */
export async function setAsQueue(
	plugin: ReactRNPlugin,
	clearToRun: boolean,
	card: Card | undefined
) {
	let cardsRemaining: number | any = await plugin.queue.getNumRemainingCards();
	let showQueue: boolean = await plugin.settings.getSetting('show-queue');
	let incognito: boolean = await plugin.settings.getSetting('incognito-mode');

	if (!showQueue) return;

	if (!incognito) {
		setActivity(plugin, clearToRun, {
			type: 0,
			application_id: '1083778386708676728',
			name: await getRPCSetting('app-name', plugin, card),
			details: await getRPCSetting('queue-details', plugin, card),
			state: await getRPCSetting('queue-state', plugin, card),
			assets: {
				large_image: LARGE_IMAGE_QUEUE_URL,
				large_text: await getRPCSetting('queue-large-text', plugin, card),
				small_image: SMALL_IMAGE_URL,
				small_text: await getRPCSetting('queue-small-text', plugin, card),
			},
			platform: await getPlatform(plugin),
		});
	} else if (incognito) {
		setActivity(plugin, clearToRun, {
			type: 0,
			application_id: '1083778386708676728',
			name: await getRPCSetting('app-name', plugin, undefined),
			details: 'Flashcard Queue',
			state: await getRPCSetting('queue-state', plugin, undefined),
			assets: {
				large_image: LARGE_IMAGE_QUEUE_URL,
				large_text: await getRPCSetting('queue-large-text', plugin, undefined),
				small_image: SMALL_IMAGE_URL,
				small_text: await getRPCSetting('queue-small-text', plugin, undefined),
			},
			platform: await getPlatform(plugin),
		});
	}
}

/**
 * Sets the user's Discord presence to "Idle" and updates the activity details.
 * @param plugin - The RemNote plugin instance.
 * @param idleCheck - A boolean indicating whether RemCord should check if the user is idle.
 * @param clearToRun - A boolean indicating whether the plugin is authorized to run.
 */
export async function setIdle(plugin: ReactRNPlugin, idleCheck: boolean, clearToRun: boolean) {
	if (!idleCheck) {
		return;
	}
	setActivity(plugin, clearToRun, {
		type: 0,
		application_id: '1083778386708676728',
		name: await getRPCSetting('app-name', plugin, undefined),
		details: await getRPCSetting('idle-details', plugin, undefined),
		state: await getRPCSetting('idle-state', plugin, undefined),
		assets: {
			large_image: LARGE_IMAGE_IDLE_URL,
			large_text: await getRPCSetting('idle-large-text', plugin, undefined),
		},
		platform: await getPlatform(plugin),
	});
}
