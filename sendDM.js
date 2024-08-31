const delay = require('./utils.js');

async function sendDMToAccount(page, msg) {
    await delay(3000);

    const messageLink = await page.$('div[data-testid="sendDMFromProfile"]');

    if (messageLink === null) {
        await page.goBack();
        await delay(3000);
        return;
    }
    await messageLink.click('svg');

    await delay(2000);
    await sendDM(page, msg);
}

async function sendDM(page, msg) {
    await page.waitForSelector('div[class="public-DraftStyleDefault-block public-DraftStyleDefault-ltr"]');

    await page.click('div[class="public-DraftStyleDefault-block public-DraftStyleDefault-ltr"]');
    await page.keyboard.type(introduceTypos(msg, 0.003), {delay: 90 + Math.random() * 60}); // typo probability of 0.3% per character
    
    const sendLink = await page.$('div[data-testid="dmComposerSendButton"]');

    if (sendLink !== null) {
        await sendLink.click('svg');
    }
    await delay(3000);
}

function introduceTypos(message, typoProbability) {
    const keyboardLayout = {
        q: "wa",
        w: "qas",
        e: "wsdr",
        r: "edft",
        t: "rfgy",
        y: "tghu",
        u: "yhji",
        i: "ujko",
        o: "iklp",
        p: "ol",
        a: "qwsz",
        s: "qwedcxz",
        d: "wersfvcx",
        f: "ertdgvc",
        g: "rtyfhvb",
        h: "tyugjbn",
        j: "yuiknhm",
        k: "uiojlm",
        l: "iopk",
        z: "asx",
        x: "zasdc",
        c: "xsdfv",
        v: "cfgb",
        b: "vghn",
        n: "bhjm",
        m: "njk",
    };
  
    let typoMessage = "";
    for (let i = 0; i < message.length; i++) {
        const char = message[i];
        if (Math.random() < typoProbability && keyboardLayout.hasOwnProperty(char.toLowerCase())) {
            const adjacentChars = keyboardLayout[char.toLowerCase()];
            const typoChar = adjacentChars[Math.floor(Math.random() * adjacentChars.length)];
            typoMessage += char === char.toUpperCase() ? typoChar.toUpperCase() : typoChar;
        } else {
            typoMessage += char;
        }
    }
    return typoMessage;
}

module.exports = {
    sendDMToAccount,
    sendDM
};