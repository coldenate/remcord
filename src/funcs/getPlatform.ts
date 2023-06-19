import { ReactRNPlugin } from '@remnote/plugin-sdk';

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
