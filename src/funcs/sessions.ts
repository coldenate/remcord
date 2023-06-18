import { ReactRNPlugin } from '@remnote/plugin-sdk';
import { backendURL } from '../widgets/index';
import { create } from 'domain';
import { Activity, Interaction, UserToken } from '../utils/interfaces';
import axios, { AxiosError, AxiosResponse } from 'axios';
import { User } from 'discord-rpc';

let timeSinceLastUpdate: Date = new Date();

// Behavior of storing the session token in the plugin.

// It will always be of type Activity. Setting and getting we can expect it to be an object that fits the Activity interface.

/**
 * Sets the session token in the plugin's storage.
 * @param plugin - The plugin instance.
 * @param sessionToken - The session token to be set.
 * @returns The session token that was set.
 */
async function setSessionToken(
	plugin: ReactRNPlugin,
	sessionToken: string
): Promise<string | undefined> {
	const originalSessionToken: string | undefined = await plugin.storage.getSynced('sessionToken');
	let sessionTokenToSet: string | undefined = sessionToken;
	console.info('original session token:', originalSessionToken);
	console.info('session token to set:', sessionTokenToSet);
	// if you can parse the session token as a json, AND retry_after has a value, then return the original session token

	try {
		const sessionTokenJSON = JSON.parse(sessionToken);
		if (sessionTokenJSON.retry_after) {
			sessionTokenToSet = originalSessionToken;
			console.warn('RATE LIMITED by discord');
			await plugin.storage.setSynced('sessionToken', sessionTokenToSet);
			return await plugin.storage.getSynced('sessionToken');
		}
	} catch (error) {
		await plugin.storage.setSynced('sessionToken', sessionTokenToSet);
		console.info('session token set:', await plugin.storage.getSynced('sessionToken'));
		return await plugin.storage.getSynced('sessionToken');
	}
}

/**
 * Gets the session token from the plugin's storage.
 * @param plugin - The plugin instance.
 * @returns The session token that was retrieved.
 */
async function getSessionToken(plugin: ReactRNPlugin): Promise<string | undefined> {
	console.info('session token:', await plugin.storage.getSynced('sessionToken'));
	let sessionToken: string | undefined | null = await plugin.storage.getSynced('sessionToken');
	if (sessionToken === null) {
		sessionToken = undefined;
	}
	return sessionToken;
}

/**
 * Clears the session token from the plugin's storage.
 * @param plugin - The plugin instance.
 * @returns The session token that was cleared.
 */
async function clearSession(plugin: ReactRNPlugin): Promise<string | undefined> {
	await plugin.storage.setSynced('sessionToken', undefined);
	await plugin.storage.setSynced('activity', undefined);
	return await plugin.storage.getSynced('sessionToken');
}

/**
 * Sets the user token in the plugin's storage.
 * @param plugin - The plugin instance.
 * @param token - The user token to be set.
 * @returns The user token that was set.
 */
export async function setUserToken(
	plugin: ReactRNPlugin,
	token: UserToken
): Promise<UserToken | undefined> {
	await plugin.storage.setSynced('userToken', token);
	return await plugin.storage.getSynced('userToken');
}

/**
 * Gets the user token from the plugin's storage.
 * @param plugin - The plugin instance.
 * @returns The user token that was retrieved.
 */
export async function getUserToken(plugin: ReactRNPlugin): Promise<UserToken | undefined> {
	return await plugin.storage.getSynced('userToken');
}

export async function refreshUserToken(plugin: ReactRNPlugin): Promise<UserToken | undefined> {
	const userToken = await getUserToken(plugin);
	if (userToken == undefined) {
		throw new Error('User token is undefined');
	}
	const interaction: Interaction = {
		token: userToken,
	};

	const response = await axios.post(`${backendURL}/refresh`, interaction);
	const newUserToken: UserToken = response.data;
	if (newUserToken === undefined) {
		throw new Error('User token is undefined');
	}
	await setUserToken(plugin, newUserToken);
	return newUserToken;
}

/**
 * Sets the activity in the plugin's storage and creates or edits a session on the remote server.
 * @param plugin - The plugin instance.
 * @param activity - The activity to be set.
 * @param clear - Whether to clear the session token and delete the session on the remote server before creating a new one. Default is false.
 * @returns The activity that was set.
 */
import { differenceInMinutes } from 'date-fns';

/**
 * Sets the activity in the plugin's storage and creates or edits a session on the remote server.
 * @param plugin - The plugin instance.
 * @param activity - The activity to be set.
 * @param clear - Whether to clear the session token and delete the session on the remote server before creating a new one. Default is false.
 * @returns The activity that was set.
 */
export async function setActivity(
	plugin: ReactRNPlugin,
	clearToRun: boolean,
	activity?: Activity,
	clear?: boolean
) {
	if (!clearToRun) {
		return;
	}
	const currentActivity: Activity | undefined = await plugin.storage.getSynced('activity');
	const currentSessionToken = await getSessionToken(plugin);
	if (activity === undefined) {
		throw new Error('Target Activity is undefined');
	}
	if (currentActivity !== undefined && currentActivity !== null) {
		// if there is no currentActivity already saved in syncedStorage
		if (currentActivity.state === activity.state) {
			// and if there is no state change
			const timeSinceLastUpdateInMinutes = differenceInMinutes(new Date(), timeSinceLastUpdate);
			if (timeSinceLastUpdateInMinutes < 15) {
				return;
			}
		}
		timeSinceLastUpdate = new Date(); // reset timeSinceLastUpdate TODO: move this to the Activity Object // DEBATE: if the TODO is even necessary
	}

	if (clear) {
		console.info('Clearing Current Session');
		await deleteSessionOnRemote(plugin, clearToRun);
		await clearSession(plugin);
	}

	if (
		typeof currentSessionToken === 'string' &&
		currentSessionToken !== null &&
		currentSessionToken !== undefined
	) {
		await editSessionOnRemote(plugin, activity);
		await plugin.storage.setSynced('activity', activity);
	} else if (currentSessionToken === undefined || currentSessionToken === null) {
		await createSessionOnRemote(plugin, activity);
		const newSessionToken = await getSessionToken(plugin);
		if (newSessionToken === undefined || newSessionToken === null) {
			throw new Error(
				'Holy moly something is really wrong here. :0 Has to do with the backend, not your fault.'
			);
		}
		await plugin.storage.setSynced('activity', activity);
	}
	return await plugin.storage.getSynced('activity');
}

/**
 * Deletes the session on the remote server.
 * @param plugin - The plugin instance.
 * @returns The response data from the server.
 * @throws An error if the user token is undefined.
 */
export async function deleteSessionOnRemote(
	plugin: ReactRNPlugin,
	clearToRun: boolean
): Promise<any> {
	if (!clearToRun) {
		return;
	}
	const sessionToken = await getSessionToken(plugin);
	const userToken = await getUserToken(plugin);
	if (userToken == undefined) {
		throw new Error('User token is undefined');
	}
	const interaction: Interaction = {
		session_id: sessionToken,
		token: userToken,
	};

	try {
		const response = await axios.post(`${backendURL}/delete`, interaction);
		await clearSession(plugin);
		return response.data;
	} catch (error: unknown) {
		if ((error as AxiosError).response && (error as AxiosError).response?.status === 404) {
			await clearSession(plugin);
			return error;
		}
		throw error;
	}
}

async function createSessionOnRemote(plugin: ReactRNPlugin, activity: Activity) {
	const userToken = await getUserToken(plugin);
	if (userToken == undefined) {
		throw new Error('User token is undefined');
	}
	const interaction: Interaction = {
		activity: activity,
		token: userToken,
	};
	if ((await getSessionToken(plugin)) !== undefined) {
		throw new Error('There is already a session token');
	}
	const response: AxiosResponse = await axios.post(`${backendURL}/create`, interaction);
	const sessionToken: string = response.data;
	if (sessionToken == undefined) {
		throw new Error('Session token is undefined');
	}
	await setSessionToken(plugin, sessionToken);
	return sessionToken;
}
/**
 * Edits the session on the remote server with the given activity.
 * @param plugin - The plugin instance.
 * @param activity - The activity to be set.
 * @returns The new session token that was set.
 * @throws An error if the user token is undefined.
 */
async function editSessionOnRemote(plugin: ReactRNPlugin, activity: Activity): Promise<string> {
	const sessionToken = await getSessionToken(plugin);
	const userToken = await getUserToken(plugin);
	if (userToken == undefined) {
		throw new Error('User token is undefined');
	}
	const interaction: Interaction = {
		session_id: sessionToken,
		token: userToken,
		activity: activity,
	};

	try {
		const response = await axios.post(`${backendURL}/edit`, interaction);
		const newSessionToken: string = response.data;
		if (newSessionToken === undefined) {
			throw new Error('Session token is undefined');
		}
		await setSessionToken(plugin, newSessionToken);
		return newSessionToken;
	} catch (error: unknown) {
		if (
			((error as AxiosError).response && (error as AxiosError).response?.status === 404) ||
			(error as AxiosError).response?.status === 400
		) {
			await clearSession(plugin);
			await createSessionOnRemote(plugin, activity);
		}
		const newSessionToken = await getSessionToken(plugin);
		return newSessionToken as string;
	}
}
