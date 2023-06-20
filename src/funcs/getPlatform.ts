import { ReactRNPlugin } from '@remnote/plugin-sdk';

/**
 * Returns the platform the plugin is running on.
 * @param plugin - The ReactRNPlugin instance.
 * @returns A promise that resolves to either 'ios', 'desktop', or 'android'.
 */
export async function getPlatform(plugin: ReactRNPlugin): Promise<'ios' | 'desktop' | 'android'> {
	// const platform = await plugin.app.getPlatform() // returns either web or app | currently broken in RN SDK

	const platform = 'app';

	if (platform === 'web') { // ignore this error for now, until RN gets back on this issue
		return 'desktop';
	} else if (platform === 'app') {
		return 'desktop';
	} else {
		return 'ios';
	}
}
