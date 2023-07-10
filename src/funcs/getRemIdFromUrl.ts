import { ReactRNPlugin } from '@remnote/plugin-sdk';

export async function getRemIdFromUrl(plugin: ReactRNPlugin): Promise<string | undefined> {
	let url = await plugin.window.getURL();
	let nurl = url.split('-');
	let finalUrl = nurl[nurl.length - 1];
	if (!finalUrl) return;

	return finalUrl;
}
