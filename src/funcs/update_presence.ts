interface SendPresenceArgs {
  details?: string;
  state?: string | null;
  largeImageKey?: string;
  largeImageText?: string;
  smallImageKey?: string;
  smallImageText?: string;
  startTimestamp?: number | Date;
  port?: number;
  destroy?: boolean;
}

function sendPresence(args: SendPresenceArgs) {
  const {
    details = '',
    state = '',
    largeImageKey = '',
    largeImageText = '',
    smallImageKey = '',
    smallImageText = '',
    startTimestamp: date = 0,
    port = 3093,
    destroy = false,
    
  } = args;

  const myHeaders: HeadersInit = new Headers();
  myHeaders.append('Content-Type', 'application/json');

  const raw = JSON.stringify({
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

  fetch(`http://localhost:${port}/activity`, requestOptions)
    .then((response: Response): Promise<string> => response.text())
    .then((result: string): void => console.log(result))
    .catch((error: Error): void => console.log('error', error));
}

export { sendPresence };
