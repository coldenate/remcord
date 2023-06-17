import { ReactRNPlugin } from '@remnote/plugin-sdk';
import { elapsedTime, pluginVersion } from '../widgets';
import { rpcSetting } from '../utils/interfaces';

// RPC Settings
export async function getRPCSetting(Name: rpcSetting, plugin: ReactRNPlugin): Promise<string> {
	const variableMethods = {
		cardsRemaining: plugin.queue.getNumRemainingCards(),
		elapsedTime: elapsedTime.toLocaleTimeString(),
		pluginVersion: pluginVersion,
		currentStreak: plugin.queue.getCurrentStreak(),
	};

	const raw_setting: string = await plugin.settings.getSetting(Name);

	// get variables ready by calling them. we'll check for their presence and replace them later
	const cardsRemaining = await plugin.queue.getNumRemainingCards();
	const elapsedParsedTime = elapsedTime.toLocaleTimeString(); // convert to human-readable time string
	const currentStreak = await plugin.queue.getCurrentStreak();

	let setting = raw_setting;

	for (const [key, value] of Object.entries(variableMethods)) {
		if (setting.includes('{' + key + '}')) {
			setting = setting.replace('{' + key + '}', String(value));
		}
	}

	return setting;
}
