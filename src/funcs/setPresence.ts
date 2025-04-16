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

	const displayRootRems = await plugin.settings.getSetting('only-display-root-rems');

	let incognito: boolean;
	incognito = await plugin.settings.getSetting('incognito-mode');

	if (displayRootRems && newRem !== undefined) {
		let found: boolean = false;
		let currentRem: Rem = newRem;
		if (currentRem === undefined) return;
		while (found === false) {
			if (currentRem.parent === 'null' || currentRem.parent === null) {
				found = true;
			} else {
				currentRem = (await plugin.rem.findOne(currentRem.parent)) as Rem;
			}
		}
		if (found) {
			// Ensure the root Rem has proper text formatting
			if (currentRem && typeof currentRem.text !== 'string') {
				// Create a new "clean" Rem object with just the properties we need
				// This avoids the [object Object] issue by ensuring text is properly stringified
				const cleanRem = {
					...currentRem,
					text: String(currentRem.text || '')
				};
				newRem = cleanRem as unknown as Rem;
			} else {
				newRem = currentRem;
			}
		}
	}

	if (incognito || newRem === undefined) {
		// Use simple text for privacy mode and explicitly set details to "Hidden" instead of using the template
		const privacyRem = newRem ? ["Privacy Mode"] : undefined;

		setActivity(plugin, clearToRun, {
			type: 0,
			application_id: '1083778386708676728',
			name: await getRPCSetting('app-name', plugin, privacyRem),
			details: await getRPCSetting('editing-details', plugin, privacyRem),
			state: await getRPCSetting('editing-state', plugin, privacyRem),
			assets: {
				large_image: LARGE_IMAGE_EDITING_URL,
				large_text: await getRPCSetting('editing-large-text', plugin, privacyRem),
				small_image: SMALL_IMAGE_URL,
				small_text: await getRPCSetting('editing-small-text', plugin, privacyRem),
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
		// Use a string array for privacy mode to match expected type
		const privacyCard = ["Privacy Mode"];

		setActivity(plugin, clearToRun, {
			type: 0,
			application_id: '1083778386708676728',
			name: await getRPCSetting('app-name', plugin, privacyCard),
			details: 'Flashcard Queue',
			state: await getRPCSetting('queue-state', plugin, privacyCard),
			assets: {
				large_image: LARGE_IMAGE_QUEUE_URL,
				large_text: await getRPCSetting('queue-large-text', plugin, privacyCard),
				small_image: SMALL_IMAGE_URL,
				small_text: await getRPCSetting('queue-small-text', plugin, privacyCard),
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
