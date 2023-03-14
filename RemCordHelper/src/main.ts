import { app, BrowserWindow } from "electron";
import * as net from "net";
import { Client } from "@xhayper/discord-rpc";

const isSecondInstance = app.requestSingleInstanceLock();

if (!isSecondInstance) {
	app.quit();
}

// RPC.setActivity({
//     details: 'RemNote',
//     state: 'Editing',
//     startTimestamp: Date.now(),
//     largeImageKey: 'mocha_logo',
//     largeImageText: 'RemNote',
//     smallImageKey: 'transparent_icon_logo',
//     smallImageText: 'RemNote',
//     instance: false,
//     buttons:[{label: "Join RemNote Discord", url: "https://discord.gg/3Z2Q9Zm"}]
//   });

const client = new Client({
	clientId: "1083778386708676728",
});

client.on("ready", () => {
	console.log("ready discord rpc");
});

client.login();

const PORT = 8080;

let mainWindow: Electron.BrowserWindow | null;
let server: net.Server;

function createWindow() {
	mainWindow = new BrowserWindow({
		width: 800,
		height: 600,
		show: false, // hide the app window when it is created
		minimizable: true,
		webPreferences: {
			nodeIntegration: true,
		},
	});
	mainWindow.loadFile("src/index.html");

	server = net.createServer((socket) => {
		socket.on("data", (data) => {
			try {
				// convert the data buffer to a string
				const dataString = data.toString();

				// split the data into headers and body
				const [headers, body] = dataString.split("\r\n\r\n");

				// parse the JSON body
				const json = JSON.parse(body);
				// process the JSON object
				client.user?.setActivity({
					details: json.details,
					state: json.state,
					startTimestamp: Date.now(),
					largeImageKey: json.largeImageKey,
					largeImageText: json.largeImageText,
					smallImageKey: json.smallImageKey,
					smallImageText: json.smallImageText,
					instance: false,
				});
			} catch (error) {
				console.error(`Error parsing JSON: ${error}`);
			}
		});
	});

	server.listen(PORT, () => {
		console.log(`Server listening on port ${PORT}`);
	});

	// Show the app window when the server is ready
	server.on("listening", () => {
		mainWindow?.show();
	});

	mainWindow.on("closed", function () {
		mainWindow = null;
	});
}

function closeServer() {
	if (server) {
		server.close();
	}
}

app.on("before-quit", () => {
	closeServer();
});

app.on("quit", () => {
	closeServer();
});

app.on("ready", createWindow);

app.on("window-all-closed", function () {
	if (process.platform !== "darwin") {
		app.quit();
	}
});

app.on("activate", function () {
	if (mainWindow === null) {
		createWindow();
	} else {
		mainWindow.show();
	}
});
