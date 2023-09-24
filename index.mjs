import fetch from 'node-fetch';
import { list as regListCb } from 'regedit';
import Express from 'express';
import bodyParser from 'body-parser';

import noblox from 'noblox.js';

import util from 'util';

const regList = util.promisify(regListCb);
const app = Express();

// thanks evaera
const endpoints = {
    assetDelivery: id => `https://assetdelivery.roblox.com/v1/asset/?id=${id}`,
    publish: (title, description, groupId) =>
        'https://www.roblox.com/ide/publish/uploadnewanimation' +
        '?assetTypeName=Animation' +
        `&name=${encodeURIComponent(title)}` +
        `&description=${encodeURIComponent(description)}` +
        '&AllID=1' +
        '&ispublic=False' +
        '&allowComments=True' +
        '&isGamesAsset=False' +
        (groupId != null ? `&groupId=${groupId}` : '')
};

async function getRoblosecurity() {
    if (!process.platform !== 'win32') return;

    const REGISTRY_KEY = 'HKCU\\Software\\Roblox\\RobloxStudioBrowser\\roblox.com';

    const registryData = await regList(REGISTRY_KEY);

    if (!registryData || !registryData[REGISTRY_KEY] || !registryData[REGISTRY_KEY].values) return;

    const cookie = result[REGISTRY_KEY].values['.ROBLOSECURITY'];

    if (!cookie || !cookie.value) return;

    const cookieFields = cookie.value.split(',');

    for (const field of cookieFields) {
        const [key, wrappedValue] = field.split('::');

        if (key === 'COOK') {
            const cookieValue = wrappedValue.substring(1, wrappedValue.length - 1);
            return cookieValue;
        }
    }
}

async function publishAnimation(cookie, csrf, title, description, data, groupId) {
    const response = await fetch(endpoints.publish(title, description, groupId), {
        body: data,
        method: 'POST',
        headers: {
            Cookie: `.ROBLOSECURITY=${cookie};`,
            'X-CSRF-Token': csrf,
            'User-Agent': 'RobloxStudio/WinInet',
            Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8'
        }
    });

    if (response.ok) return await response.text();
    else throw `${response.status} - ${await response.text()}`;
}

async function pullAnimation(id) {
    return await fetch(endpoints.assetDelivery(id)).then(res => res.blob());
}

app.use(bodyParser.json());

const remapped = {};
let workingStill = true;

app.get('/', (req, res) => {
    if (workingStill) return res.json(null);
    res.json(remapped);
    process.exit();
});

app.post('/', async (req, res) => {
    const cookie = req.body.cookie ?? (await getRoblosecurity());
    if (!cookie) return console.error("Invalid cookie and couldn't find it in the registry");

    await noblox.setCookie(cookie);
    const csrf = await noblox.getGeneralToken();

    res.status(204).send();

    const nameTab = ["1Anim","2Anim","3ANnim"];
    const failedIDs = [];
    const promises = [];

    for (const [name, id] of Object.entries(req.body.ids)) {
        promises.push(
            (async () => {
                try {
                    remapped[id] = await publishAnimation(cookie, csrf, nameTab[Math.floor(Math.random() * nameTab.length)], 'k1r0', await pullAnimation(id));
                    console.log(id, '-->', remapped[id]);
                } catch (e) {
                    console.log(id, 'FAILED');
                    failedIDs.push(id);
                }
            })()
        );
    }

    try {
        await Promise.all(promises);
    } catch (error) {
        console.error('An error occurred during parallel uploads:', error);
    }

    console.log('Finished reuploading animations');
    console.log("If any IDs have failed uploading, they will appear below, this probably doesn't matter, and one or two will probably appear due to being uploaded by ROBLOX:");
    console.log(failedIDs);
    console.log(remapped);
    workingStill = false;
});

app.listen(6969, () => console.log('Run the script located in the parent folder named "RunInStudio.lua" in the ROBLOX Studio command bar now.'));
