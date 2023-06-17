import { ReactRNPlugin } from '@remnote/plugin-sdk';

export async function getPlatform(plugin: ReactRNPlugin): Promise<'web' | 'desktop' | 'mobile'> {
	const platform = await plugin.app.getPlatform(); // returns either web or app

	if (platform === 'web') {
		return 'web';
	} else if (platform === 'app') {
		return 'desktop';
	} else {
		return 'mobile';
	}
}
