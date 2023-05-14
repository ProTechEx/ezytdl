const { BrowserWindow, app, globalShortcut, session, contextBridge, ipcRenderer } = require('electron');

let currentWindow = null;

const path = require('path')

const platform = process.platform;

let s = `/`;
if(platform == `win32`) s = `\\`;

module.exports = () => {
    if(!app.isReady()) return null;

    if(currentWindow) return currentWindow;

    console.log(platform)

    const iconPath = `buildResources${s}packageIcons${s}icon-${platform == `win32` ? `64x64.ico` : `512x512.png`}`

    console.log(`Icon path: ${iconPath}`)

    const args = {
        width: 800,
        height: 500,
        minHeight: 300,
        minWidth: 550,
        autoHideMenuBar: true,
        webPreferences: {
            nodeIntegration: false,
            nodeIntegrationInWorker: false,
            contextIsolation: true,
            devTools: true,
            preload: path.join(__dirname, `preload.js`)
        },
        icon: iconPath
    };

    require(`./ipcHandler`)();

    if(app.isPackaged) {
        console.log(`-------------\nSTARTING WITH PRODUCTION MODE\n-------------`)

        args.webPreferences.devTools = false;

        const setShortcuts = (enable) => {
            const accelerators = [`CommandOrControl+Shift+I`, `F12`];

            accelerators.forEach((accelerator) => {
                if(enable) {
                    console.log(`Disabled shortcut ${accelerator} (window is focused))`)
                    globalShortcut.register(accelerator, () => false);
                } else {
                    console.log(`Re-enabled shortcut ${accelerator} (window is unfocused)`)
                    globalShortcut.unregister(accelerator);
                }
            })
        }

        app.on('browser-window-blur', function () {
            setShortcuts(false);
        });

        app.on('browser-window-focus', function () {
            setShortcuts(true);
        })
    } else {
        console.log(`-------------\nSTARTING WITH DEVELOPMENT MODE\n-------------`);

        args.width = 1100;
    }

    if(currentWindow) return currentWindow;
    
    const window = new BrowserWindow(args);

    if(!app.isPackaged) {
        //window.webContents.openDevTools();
    };

    require(`./lockdown`)();

    currentWindow = window;

    return window;
}