const delay = require('./utils.js');
const appendFileSync = require('fs').appendFileSync;
const readFileSync = require('fs').readFileSync;
const {
    sendDMToAccount,
    sendDM
 } = require('./sendDM.js');

const message = require('./messages.json');

let botName;

async function checkAccountLimits(page, accountLink) {
    let accountName = accountLink.split('/');
    accountName = accountName[accountName.length - 1];

    let followings = await page.$eval('a[href="/' + accountName + '/following"]', e => e.innerText);
    followings = Number(followings.split(' ')[0]);
    let followers = await page.$eval('a[href="/' + accountName + '/followers"]', e => e.innerText);
    followers = Number(followers.split(' ')[0]);

    if (followings >= 100 && followers >= 100 && followings <= 500 && followers <= 500) {
        return true
    } else {
        return false
    }
}

async function welcomeNewFollowers(name, browser, page, numberDm) {
    botName = name;

    // get old followers (stored in followers.csv)
    let oldFollowers = new Set()
    console.log("Retrieving old followers...")
    try {
        let csvContent = readFileSync('./' + botName + '/followers.csv', { encoding: 'utf8', flag: 'r' });
        let arrayFollowers = csvContent.split('\n');
        oldFollowers = new Set(arrayFollowers.filter(word => word.length > 0))
    } catch {
    }

    // get list of users already we already engaged with
    let engaged = new Set()
    try {
        let csvContent = readFileSync('./' + botName + '/engaged.csv', { encoding: 'utf8', flag: 'r' });
        let arrayEngaged = csvContent.split('\n');
        engaged = new Set(arrayEngaged.filter(word => word.length > 0))
    } catch {
    }

    // get current followers
    await page.waitForSelector('[aria-label="Profile"]');
    await page.click('a[aria-label="Profile"]');
    await delay(3000);

    let pageUrl = await page.url();

    let accountName = pageUrl.split('/');
    accountName = accountName[accountName.length - 1];

    let textFollowers = await page.$('a[href="/' + accountName + '/followers"]');
    let numOfFollowers = await page.$eval('a[href="/' + accountName + '/followers"]', e => e.innerText);
    numOfFollowers = Number(numOfFollowers.split(' ')[0]);

    await textFollowers.click();
    await delay(2000);

    console.log("Getting current followers...");
    let followers = new Set()
    let sentDm = 0
    try {
        let previousHeight;
        while (followers.size < Number(numOfFollowers)) {
            const followersArea = await page.$('div[aria-label="Timeline: Followers"]');

            const elementHandles = await followersArea.$x('//a[@class="css-4rbku5 css-18t94o4 css-1dbjc4n r-1niwhzg r-1loqt21 r-1pi2tsx r-1ny4l3l r-o7ynqc r-6416eg r-13qz1uu"]');
            for (let i = 0; i < elementHandles.length; i++) {
                let href = await elementHandles[i].getProperty('href');
                let url = await href.jsonValue();
                followers.add(url);

                if (sentDm >= numberDm) {
                    break
                }

                if (!(oldFollowers.has(url)) && !(engaged.has(url))) {
                    await page.hover('a[href="/home"]');
                    await delay(1000);
                    await elementHandles[i].click({button: 'middle'});
                    await delay(2000);
                    
                    let pages = await browser.pages();
                    let newPage = pages[pages.length - 1];
                    await newPage.bringToFront();
                    await delay(1000);

                    try {
                        let limitsAccount = await checkAccountLimits(newPage, url);

                        // send message
                        await sendDMToAccount(newPage, message.welcome[Math.floor(Math.random() * message.welcome.length)]);
                        oldFollowers.add(url);
                        try {
                            appendFileSync('./' + botName + '/followers.csv', url + '\n');
                        } catch (e) {
                            console.error(e);
                        }

                        if (Math.random() < 0.8 && limitsAccount) {
                            await delay(6000);

                            await sendDM(newPage, message.engage[Math.floor(Math.random() * message.engage.length)]);

                            try {
                                appendFileSync('./' + botName + '/engaged.csv', url + '\n');
                            } catch (e) {
                                console.error(e);
                            }
                        }
                    sentDm++;
                    } catch(e) {

                    }
                    await delay(1000);
                    await newPage.close();
                }
            }

            if (sentDm >= numberDm) {
                break
            }

            previousHeight = await page.evaluate('document.body.scrollHeight');
            await elementHandles[elementHandles.length - 1].scrollIntoView({ behavior: 'smooth', block: 'end', inline: 'end' });
            await delay(2500);
            let newHeight = await page.evaluate('document.body.scrollHeight');
            if (newHeight === previousHeight) {
                break;
            }

            /*
            if (followers.size < Number(numOfFollowers)) {
                previousHeight = await page.evaluate('document.body.scrollHeight');
                //await page.evaluate('window.scrollTo(0, document.body.scrollHeight)');
                await page.evaluate(() => {
                    window.scrollBy(0, 2 * document.body.clientHeight);
                });
                //await page.mouse.wheel({deltaY: -100});
                await page.waitForFunction(`document.body.scrollHeight > ${previousHeight}`, {timeout: 10000});
            }
            */
            await delay(2000);
        }
    } catch(e) { 
        console.error("Could not find " + numOfFollowers + " followers");
        console.error(e);
    }
    await page.goBack();
    await delay(3000);
    await page.goBack();
    await delay(5000);

    return sentDm;
}

module.exports = welcomeNewFollowers;