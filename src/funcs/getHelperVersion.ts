async function getVersion(): Promise<string> {
  const myHeaders: HeadersInit = new Headers();
  let version: string = 'null';
  myHeaders.append('Content-Type', 'application/json');

  const requestOptions: RequestInit = {
    method: 'GET',
    headers: myHeaders,
    redirect: 'follow',
  };

  try {
    const response: Response = await fetch(`http://localhost:3093/version`, requestOptions);
    const result: string = await response.text();
    version = JSON.parse(result).version;
    version = `v${version}`;
  } catch (error: any | unknown) {
    console.log('error', error);
  }

  return version;
}

export { getVersion as getHelperVersion };
