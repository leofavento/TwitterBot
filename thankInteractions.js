const delay = require('./utils.js');
const readFileSync = require('fs').readFileSync;
const writeFileSync = require('fs').writeFileSync;
const appendFileSync = require('fs').appendFileSync;
const messages = require('./messages.json');
const {
    sendDM
 } = require('./sendDM.js');

const message = require('./messages.json');

async function thankInteractions(page, availableDm) {
    let toThank = []
    try {
        let csvContent = readFileSync('./toThank.csv', { encoding: 'utf8', flag: 'r' });
        toThank = csvContent.split('\n');
        toThank = toThank.filter(word => word.length > 0);
    } catch {
    }

    let engaged = new Set()
    try {
        let csvContent = readFileSync('./engaged.csv', { encoding: 'utf8', flag: 'r' });
        let arrayEngaged = csvContent.split('\n');
        engaged = new Set(arrayEngaged.filter(word => word.length > 0))
    } catch {
    }

    if (toThank.length === 0) {
        return 0
    }

    await delay(2000);
    await page.click('a[data-testid="AppTabBar_DirectMessage_Link"]');
    await delay(2000);

    let newDmButton = await page.$('a[data-testid="NewDM_Button"]');
    
    let usersSent = new Set();
    for (let i = 0; i < availableDm && i < toThank.length; i++) {
        if (engaged.has('https://twitter.com/' + toThank[i].substring(1))) {
            usersSent.add(toThank[i]);
            continue;
        }

        await newDmButton.click();
        await delay(1500);

        await page.type('input[data-testid="searchPeople"]', toThank[i], {delay: 90 + Math.random() * 60});
        await delay(4500);

        let listOfUsers = await page.$('form[aria-label="Search people"]');
        if (listOfUsers === null) {
            await newDmButton.click();
            await delay(3000);
            continue
        }
        let selectedUser = await listOfUsers.$('div[data-testid="TypeaheadUser"]');
        if (selectedUser === null) {
            await newDmButton.click();
            await delay(3000);
            continue
        }
        await selectedUser.click();

        await delay(2000);

        let nextButton = await page.$('div[data-testid="nextButton"]');
        let attr = await page.evaluate(nextButton => nextButton.getAttribute("aria-disabled"), nextButton);
        if (attr === "true") {
            await newDmButton.click();
            await delay(3000);
            continue
        }
        await nextButton.click()

        await delay(3000);

        await sendDM(page, messages.thank[Math.floor(Math.random() * messages.thank.length)]);

        await delay (6000);

        await sendDM(page, messages.engage[Math.floor(Math.random() * messages.engage.length)]);

        usersSent.add(toThank[i]);

        try {
            appendFileSync('./engaged.csv', 'https://twitter.com/' + toThank[i].substring(1) + '\n');
        } catch (e) {
            console.error(e);
        }

        await delay(18000);
    }

    toThank = new Set(toThank.filter(user => !Array.from(usersSent).includes(user)));

    let csvContent = ''
    toThank.forEach(el => {
        csvContent += el + '\n'
    })
    try {
        writeFileSync('./toThank.csv', csvContent);
    } catch (e) {
        console.error(e);
    }

    return usersSent.size;
}

module.exports = thankInteractions;