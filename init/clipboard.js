const { clipboard, Notification } = require('electron');
const genericUrlRegex = /^https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)$/;

let started = false;

const start = async () => {
    if(!started) {
        started = true;

        let lastText = null;

        console.log(`Starting clipboard listener`);

        let sendNotifsEverTrue = false;

        while(true) await new Promise(async res => {
            if(global.downloadFromClipboard && (global.sendNotifs || sendNotifsEverTrue)) try {
                sendNotifsEverTrue = true;
                const text = clipboard.readText();
                if(typeof text == `string` && text != lastText && text.split(`?`)[0].match(genericUrlRegex)) {
                    console.log(`new clipboard text, is url!`)
                    lastText = text;

                    const notif = new Notification({
                        title: `Download recently copied link?`,
                        body: `The link "${text}" was recently copied to your clipboard. Would you like to download it?`,
                        icon: require(`../core/downloadIcon`).get(`active`, null, true)
                    });

                    notif.show();

                    notif.on(`click`, (event, arg) => {
                        require(`../core/bringToFront`)();
                        console.log(`Downloading ${text}`);
                        global.window.webContents.send(`download`, text);
                    })
                } else if(text != lastText) {
                    console.log(`new clipboard text, but not url`)
                    lastText = text;
                }
            } catch(e) {
                console.error(`Failed to get clipboard`, e);
            }

            setTimeout(res, 1000)
        })
    }
}

module.exports = () => {
    start();
    return true;
}