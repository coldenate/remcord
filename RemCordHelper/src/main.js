"use strict";
exports.__esModule = true;
var electron_1 = require("electron");
var net = require("net");
var discord_rpc_1 = require("@xhayper/discord-rpc");
var isSecondInstance = electron_1.app.requestSingleInstanceLock();
if (!isSecondInstance) {
    electron_1.app.quit();
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
var client = new discord_rpc_1.Client({
    clientId: "1083778386708676728"
});
client.on("ready", function () {
    console.log("ready discord rpc");
});
client.login();
var PORT = 8080;
var mainWindow;
var server;
function createWindow() {
    mainWindow = new electron_1.BrowserWindow({
        width: 800,
        height: 600,
        show: false,
        minimizable: true,
        webPreferences: {
            nodeIntegration: true
        }
    });
    mainWindow.loadFile("src/index.html");
    server = net.createServer(function (socket) {
        socket.on("data", function (data) {
            var _a;
            try {
                // convert the data buffer to a string
                var dataString = data.toString();
                // split the data into headers and body
                var _b = dataString.split("\r\n\r\n"), headers = _b[0], body = _b[1];
                // parse the JSON body
                var json = JSON.parse(body);
                // process the JSON object
                (_a = client.user) === null || _a === void 0 ? void 0 : _a.setActivity({
                    details: json.details,
                    state: json.state,
                    startTimestamp: Date.now(),
                    largeImageKey: json.largeImageKey,
                    largeImageText: json.largeImageText,
                    smallImageKey: json.smallImageKey,
                    smallImageText: json.smallImageText,
                    instance: true
                });
            }
            catch (error) {
                console.error("Error parsing JSON: ".concat(error));
            }
        });
    });
    server.listen(PORT, function () {
        console.log("Server listening on port ".concat(PORT));
    });
    // Show the app window when the server is ready
    server.on("listening", function () {
        mainWindow === null || mainWindow === void 0 ? void 0 : mainWindow.show();
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
electron_1.app.on("before-quit", function () {
    closeServer();
});
electron_1.app.on("quit", function () {
    closeServer();
});
electron_1.app.on("ready", createWindow);
electron_1.app.on("window-all-closed", function () {
    if (process.platform !== "darwin") {
        electron_1.app.quit();
    }
});
electron_1.app.on("activate", function () {
    if (mainWindow === null) {
        createWindow();
    }
    else {
        mainWindow.show();
    }
});
