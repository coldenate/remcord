interface SendPresenceArgs {
	details?: string | undefined | unknown;
	state?: string | null;
	largeImageKey?: string;
	largeImageText?: string;
	smallImageKey?: string;
	smallImageText?: string;
	startTimestamp?: number | Date;
	destroy?: boolean;
}

function sendPresence(args: SendPresenceArgs) {
	const {
		details,
		state,
		largeImageKey = '',
		largeImageText = '',
		smallImageKey = '',
		smallImageText = '',
		startTimestamp: date = 0,
		destroy = false,
	} = args;

	const myHeaders: HeadersInit = new Headers();
	myHeaders.append('Content-Type', 'application/json');

	// iterate through each key and remove it if it's null
	Object.keys(args).forEach((key: keyof SendPresenceArgs): void => {
		if (args[key] === null) {
			delete args[key];
		}
	});


	const raw = JSON.stringify({
		destroy,
		details,
		state,
		largeImageKey,
		largeImageText,
		smallImageKey,
		smallImageText,
		date,
	});

	const requestOptions: RequestInit = {
		method: 'POST',
		headers: myHeaders,
		body: raw,
		redirect: 'follow',
	};

	fetch(``, requestOptions)
		.then((response: Response): Promise<string> => response.text())
		.catch((error: Error): void => console.error('error', error));
}

export { sendPresence };
