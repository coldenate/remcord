import { ReactRNPlugin } from '@remnote/plugin-sdk';
import { elapsedTime, pluginVersion } from '../widgets';
import { rpcSetting } from '../utils/interfaces';



export const variableMethods = {
	cardsRemaining: (plugin: ReactRNPlugin) => plugin.queue.getNumRemainingCards(),
	elapsedTime: (plugin: ReactRNPlugin) => elapsedTime.toLocaleTimeString(),
	pluginVersion: (plugin: ReactRNPlugin) => pluginVersion,
	currentStreak: (plugin: ReactRNPlugin) => plugin.queue.getCurrentStreak(),
};

export async function getRPCSetting(Name: rpcSetting, plugin: ReactRNPlugin): Promise<string> {
	const raw_setting: string = await plugin.settings.getSetting(Name);

	// get variables ready by calling them. we'll check for their presence and replace them later
	const variables: Record<string, any> = {};
	for (const [key, value] of Object.entries(variableMethods)) {
		variables[key] = await value(plugin);
	}

	let setting = raw_setting;

	for (const [key, value] of Object.entries(variables)) {
		if (setting.includes('{' + key + '}')) {
			setting = setting.replace('{' + key + '}', String(value));
		}
	}

	return setting;
}

export async function getPossibleRPCVariables(plugin: ReactRNPlugin): Promise<Record<string, any>> {
	// TODO: make the returned string human readable/prettier
	const variables: Array<string> = [...Object.keys(variableMethods)];
	return variables;
}