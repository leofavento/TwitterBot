const delay = require('./utils.js');
const messages = require('./messages.json');
const {
    sendDM
} = require('./sendDM.js');

let botName;

function editDistance(s1, s2) {
    s1 = s1.toLowerCase();
    s2 = s2.toLowerCase();
  
    var costs = new Array();
    for (var i = 0; i <= s1.length; i++) {
        var lastValue = i;
        for (var j = 0; j <= s2.length; j++) {
            if (i == 0)
            costs[j] = j;
            else {
            if (j > 0) {
                var newValue = costs[j - 1];
                if (s1.charAt(i - 1) != s2.charAt(j - 1))
                    newValue = Math.min(Math.min(newValue, lastValue), costs[j]) + 1;
                costs[j - 1] = lastValue;
                lastValue = newValue;
            }
        }
    }
    if (i > 0)
        costs[s2.length] = lastValue;
    }
    return costs[s2.length];
}

// Levenshtein distance to compute similarity between 2 strings
function similarity(s1, s2) {
    var longer = s1;
    var shorter = s2;
    if (s1.length < s2.length) {
        longer = s2;
        shorter = s1;
    }
    var longerLength = longer.length;
    if (longerLength == 0) {
        return 1.0;
    }
    return (longerLength - editDistance(longer, shorter)) / parseFloat(longerLength);
}

async function getState(textMessages) {
    let welcome = messages.welcome;

    let welcomeDone = false;
    for (let i = 0; i < welcome.length; i++) {
        for (let j = 0; j < textMessages.length; j++) {
            /*
            if (welcome[i].length !== textMessages[j].length) {
                continue;
            }
            let equalChars = 0;
            for (let k = 0; k < welcome[i].length; k++) {
                if (welcome[i].charAt(k) === textMessages[j].charAt(k)) {
                    equalChars++;
                }
            }
            if (equalChars / welcome[i].length > 0.7) {
                welcomeDone = true;
            }
            */
            if (similarity(welcome[i], textMessages[j]) > 0.7) {
                welcomeDone = true;
            }
        }
    }
    if (welcomeDone === false) {
        return 0;
    }

    let doYouLike = messages.doyoulike;
    let doYouLikeDone = false;
    for (let i = 0; i < doYouLike.length; i++) {
        for (let j = 0; j < textMessages.length; j++) {
            /*
            if (doYouLike[i].length !== textMessages[j].length) {
                continue;
            }
            let equalChars = 0;
            for (let k = 0; k < doYouLike[i].length; k++) {
                if (doYouLike[i].charAt(k) === textMessages[j].charAt(k)) {
                    equalChars++;
                }
            }
            if (equalChars / doYouLike[i].length > 0.7) {
                doYouLikeDone = true;
            }
            */
            if (similarity(doYouLike[i], textMessages[j]) > 0.7) {
                doYouLikeDone = true;
            }
        }
    }
    if (doYouLikeDone === false) {
        return 1;
    }

    return 2;
}

async function readDms(browser, page, numberDm) {
    await delay(3000);

    let messagesTimeline = await page.$('div[aria-label="Timeline: Messages"]');

    let sentDm = 0

    let checkNewMessages = await messagesTimeline.$x('//div[@class="css-1dbjc4n r-l5o3uw r-11mg6pl r-sdzlij r-1phboty r-rs99b7 r-1or9b2r r-1lg5ma5 r-u8s1d r-1gg5ah6 r-3sxh79 r-lrvibr r-5soawk"]');

    try {
        while (checkNewMessages.length > 0) {
            let initialNumber = checkNewMessages.length;
            const cells = await messagesTimeline.$x('//div[@data-testid="cellInnerDiv"]');
            for (let i = 0; i < cells.length; i++) {
                await delay(500);
                let newMsg = await cells[i].$('div[class="css-1dbjc4n r-l5o3uw r-11mg6pl r-sdzlij r-1phboty r-rs99b7 r-1or9b2r r-1lg5ma5 r-u8s1d r-1gg5ah6 r-3sxh79 r-lrvibr r-5soawk"]');
                if (newMsg === null) {
                    continue;
                }
                let clickMessage = await cells[i].$('span[data-testid="tweetText"]');
                if (clickMessage === null) {
                    continue;
                }
                await clickMessage.click();
                try {
                    await delay(1300);

                    let messagesArea = await page.$('div[data-testid="DmScrollerContainer"]');

                    let currentMessages = await messagesArea.$x('//div[@data-testid="messageEntry"]');

                    let textMessages = [];

                    for (let j = 0; j < currentMessages.length; j++) {
                        const textContent = await (await currentMessages[j].getProperty('textContent')).jsonValue();
                        console.log(textContent);
                        textMessages.push(textContent);
                    }

                    let state = await getState(textMessages);

                    if (state === 0) {
                        await delay(4000);
                        await sendDM(page, messages.welcome[Math.floor(Math.random() * messages.welcome.length)]);
                        sentDm++;
                    } else if (state === 1) {
                        await delay(4000);
                        await sendDM(page, messages.doyoulike[Math.floor(Math.random() * messages.doyoulike.length)]);
                        sentDm++;
                    }
                } catch (e) {
                    continue;
                }
            }
            await cells[cells.length - 1].scrollIntoView({ behavior: 'smooth', block: 'end', inline: 'end' });
            checkNewMessages = await messagesTimeline.$x('//div[@class="css-1dbjc4n r-l5o3uw r-11mg6pl r-sdzlij r-1phboty r-rs99b7 r-1or9b2r r-1lg5ma5 r-u8s1d r-1gg5ah6 r-3sxh79 r-lrvibr r-5soawk"]');
            if (initialNumber === checkNewMessages.length) {
                break;
            }
        }
    } catch (e) {
        
    }
    return sentDm;
}

async function handleDms(cursor, name, browser, page, numberDm) {
    botName = name;
    
    await delay(2000);
    await cursor.click('a[data-testid="AppTabBar_DirectMessage_Link"]');

    let sentDm = await readDms(browser, page, numberDm);
    
    return sentDm;
}

module.exports = handleDms;