import { ReactRNPlugin } from '@remnote/plugin-sdk';
import { create } from 'domain';
import { Activity, Interaction, UserToken } from '../utils/interfaces';
import axios, { AxiosError, AxiosResponse } from 'axios';
import { User } from 'discord-rpc';
import { differenceInMinutes } from 'date-fns';
import { backendURL } from '../utils/constants';

let timeSinceLastUpdate: Date = new Date();
let timeSinceLastRequestToDiscord: Date = new Date();

/**
 * Determines if it is safe to make a request to Discord's API by checking the time elapsed since the last request.
 * If the time elapsed is less than 5 seconds, the function waits for the remaining time before returning true.
 * @returns A boolean indicating whether it is safe to make a request to Discord's API.
 */
async function safeToRequest(): Promise<boolean> {
	const timeSinceLastRequest = new Date().getTime() - timeSinceLastRequestToDiscord.getTime();
	const timeInSeconds = timeSinceLastRequest / 1000;
	if (timeInSeconds < 5) {
		await new Promise((resolve) => setTimeout(resolve, (5 - timeInSeconds) * 1000));
	}
	return true;
}

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

	try {
		const response = await axios.post(`${backendURL}/refresh`, interaction, { timeout: 5000 });
		const newUserToken: UserToken = response.data as UserToken;
		if (newUserToken === undefined) {
			throw new Error('User token is undefined');
		}
		await setUserToken(plugin, newUserToken);
		return newUserToken;
	} catch (error: unknown) {
		if (axios.isAxiosError(error) && error.response && error.response.status === 401) {
			plugin.app.toast("You're not logged into Discord. Please log in to Discord and try again.");
		}
		throw error;
	}
}

/**
 * Gets the activity from the plugin's storage.
 * @param plugin - The plugin instance.
 * @returns The activity that was retrieved.
 */
export async function getActivity(plugin: ReactRNPlugin): Promise<Activity | undefined> {
	return await plugin.storage.getSynced('activity');
}

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
	clear?: boolean,
	force?: boolean
) {
	if (!clearToRun) {
		console.warn('Not Clear to Run');
		return;
	}
	const currentActivity: Activity | undefined = await plugin.storage.getSynced('activity');
	const currentSessionToken = await getSessionToken(plugin);
	if (activity === undefined) {
		throw new Error('Target Activity is undefined');
	}
	if (currentActivity !== undefined && currentActivity !== null) {
		if (
			currentActivity.state === activity.state &&
			currentActivity.details === activity.details &&
			!force
		) {
			// this checks if there was "no change" in the activity
			const timeSinceLastUpdateInMinutes = differenceInMinutes(new Date(), timeSinceLastUpdate);
			if (timeSinceLastUpdateInMinutes < 15) {
				return;
			}
		}
		timeSinceLastUpdate = new Date(); // NOTE: move this to the Activity Object. This can allow for a cross-platform solution, but its not a priority/necessary.
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
	timeSinceLastRequestToDiscord = new Date();

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
	await safeToRequest();
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
		if ((error as AxiosError).response && (error as AxiosError).response?.status === 401) {
			plugin.app.toast("You're not logged into Discord. Please log in to Discord and try again.");
		}
		throw error;
	}
}

async function createSessionOnRemote(plugin: ReactRNPlugin, activity: Activity) {
	await safeToRequest();
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
	try {
		const response: AxiosResponse = await axios.post(`${backendURL}/create`, interaction);
		const sessionToken: string = response.data;
		if (sessionToken == undefined) {
			throw new Error('Session token is undefined');
		}
		await setSessionToken(plugin, sessionToken);
		return sessionToken;
	} catch (error: unknown) {
		if (axios.isAxiosError(error) && error.response && error.response.status === 401) {
			plugin.app.toast("You're not logged into Discord. Please log in to Discord and try again.");
		}
		throw error;
	}
}
/**
 * Edits the session on the remote server with the given activity.
 * @param plugin - The plugin instance.
 * @param activity - The activity to be set.
 * @returns The new session token that was set.
 * @throws An error if the user token is undefined.
 */
async function editSessionOnRemote(plugin: ReactRNPlugin, activity: Activity): Promise<string> {
	await safeToRequest();
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
			setTimeout(async () => {
				await createSessionOnRemote(plugin, activity); // this is a ratelimit protection.
			}, 2500);
		}
		if ((error as AxiosError).response && (error as AxiosError).response?.status === 401) {
			plugin.app.toast("You're not logged into Discord. Please log in to Discord and try again.");
			throw error;
		}
		const newSessionToken = await getSessionToken(plugin);
		return newSessionToken as string;
	}
}

export async function sendHeartbeat(plugin: ReactRNPlugin) {
	const sessionToken = await getSessionToken(plugin);
	const userToken = await getUserToken(plugin);
	const activity = await getActivity(plugin);
	if (userToken == undefined) {
		throw new Error('User token is undefined');
	}
	const interaction: Interaction = {
		session_id: sessionToken,
		token: userToken,
		activity: activity,
	};
	try {
		const response = await axios.post(`${backendURL}/heartbeat`, interaction);
		return response.data;
	} catch (error: unknown) {
		if ((error as AxiosError).response && (error as AxiosError).response?.status === 404) {
			await clearSession(plugin);
			return error;
		}
		throw error;
	}
}

function differenceInMilliseconds(arg0: Date, timeSinceLastRequestToDiscord: Date) {
	throw new Error('Function not implemented.');
}
