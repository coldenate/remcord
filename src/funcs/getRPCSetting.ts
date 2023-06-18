import { Card, ReactRNPlugin, Rem, RichTextInterface } from '@remnote/plugin-sdk';
import { elapsedTime, pluginVersion } from '../widgets';
import { rpcSetting } from '../utils/interfaces';

// let editingText: string = await plugin.settings.getSetting('editing-text');
// if (editingText.includes('{remName}')) {
// 	editingText = editingText.replace('{remName}', currentRemName);
// }

// let editingDetails: string = await plugin.settings.getSetting('editing-details');
// if (editingDetails.includes('{remName}')) {
// 	editingDetails = editingDetails.replace('{remName}', parentRemName);
// }

type VariableType = 'static' | 'dynamic';

interface Variable {
	type: VariableType;
	value: any;
	context: 'editor' | 'queue' | 'idle' | 'all';
}

interface VariableMap {
	[key: string]: Variable;
}

export const variableMethods: VariableMap = {
	cardsRemaining: {
		type: 'dynamic',
		value: (plugin: ReactRNPlugin) => plugin.queue.getNumRemainingCards(),
		context: 'queue',
	},
	elapsedTime: {
		type: 'dynamic',
		value: (plugin: ReactRNPlugin) => elapsedTime.toLocaleTimeString(),
		context: 'all',
	},
	pluginVersion: {
		type: 'dynamic',
		value: (plugin: ReactRNPlugin) => pluginVersion,
		context: 'all',
	},
	currentStreak: {
		type: 'dynamic',
		value: (plugin: ReactRNPlugin) => plugin.queue.getCurrentStreak(),
		context: 'queue',
	},
	remName: {
		type: 'static',
		value: '{remName}',
		context: 'editor',
	},
};

export async function getRPCSetting(
	Name: rpcSetting,
	plugin: ReactRNPlugin,
	inputVariable: Array<string | Rem> | undefined | Card
): Promise<string> {
	const raw_setting: string = await plugin.settings.getSetting(Name);

	let processedInputVariable: string | RichTextInterface;

	// get variables ready by calling them. we'll check for their presence and replace them later
	const variables: Record<string, any> = {};
	// for (const [key, value] of Object.entries(variableMethods)) {
	// 	variables[key] = await value(plugin);
	// }
	for (const [key, variable] of Object.entries(variableMethods)) {
		if (variable.type === 'dynamic') {
			variables[key] = await variable.value(plugin);
		} else if (variable.type === 'static') {
			switch (variable.context) {
				case 'editor': {
					if (inputVariable === undefined) {
						console.warn('Static variable ' + key + ' requires an input variable');
						continue;
					}

					if (key === 'remName') {
						if (inputVariable instanceof Rem) {
							processedInputVariable = inputVariable?.text ?? '';
							variables[key] = processedInputVariable;
						} else if (typeof inputVariable === 'string') {
							processedInputVariable = inputVariable;
							variables[key] = processedInputVariable;
						}
					}
				}
				case 'queue': {
					if (inputVariable === undefined) {
						console.warn('Static variable ' + key + ' requires an input variable');
						continue;
					}
					if (key === 'cardName') {
						processedInputVariable =
							(await plugin.rem.findOne((inputVariable as Card)?.remId))?.text ?? '';
						variables[key] = processedInputVariable;
					}
				}
			}
		}
	}

	let setting = raw_setting;

	for (const [key, variable] of Object.entries(variables)) {
		if (setting.includes('{' + key + '}')) {
			setting = setting.replace('{' + key + '}', String(variable));
		}
	}

	return setting;
}

export async function getPossibleRPCVariables(plugin: ReactRNPlugin): Promise<Record<string, any>> {
	// TODO: make the returned string human readable/prettier
	const variables: Array<string> = [...Object.keys(variableMethods)];
	return variables;
}
