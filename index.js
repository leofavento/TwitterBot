const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth')

const dolphin = require('./connectDolphinAnty.js');

puppeteer.use(StealthPlugin());

const credentials = require('./credentials.json');
const hashtags = require('./hashtags.json').hashtags;
const { createCursor } = require('ghost-cursor');

const {
    updateFollowings,
    downloadFollowings
} = require('./currentFollowings.js');
const interactCommentUserByResearch = require('./posts.js');
const welcomeNewFollowers = require('./welcomeFollowers.js');
const handleNotifications = require('./notifications.js');
const thankInteractions = require('./thankInteractions.js');
const interactProfile = require('./profiles.js');
const scrapeLikes = require('./scrapeLikes.js');
const unfollowUsers = require('./unfollowUsers.js');
const readFileSync = require('fs').readFileSync;
const writeFileSync = require('fs').writeFileSync;
const checkDm = require('./checkDm.js');

let browser = null;
let page = null;

const delay = require('./utils.js');

async function login(accountName) {
    await delay(2000);

    let checkLoggedIn = await page.$('input[name="text"]');
    if (checkLoggedIn === null) {
        return;
    }

    console.log("Logging in...");

    await page.waitForSelector('[name="text"]');
    await page.type('input[name="text"]', accountName, {delay: 90 + Math.random() * 60});

    await delay(500);

    const next = await page.$x("//span[contains(text(), 'Next')]");

    if (next.length > 0) {
        await next[0].click();
      } else {
        throw new Error(`Link not found: Next`);
    }

    await delay(2000);

    await page.waitForSelector('[name="password"]');
    await page.type('input[name="password"]', credentials.twitter[accountName], {delay: 90 + Math.random() * 60});   
    
    await delay(500);

    const login = await page.$x("//span[contains(text(), 'Log in')]");

    if (login.length > 0) {
        await login[0].click();
      } else {
        throw new Error(`Link not found: Login`);
    }

    await delay(4000);
}

async function refuseCookies() {
    const refuseCookies = await page.$x("//span[contains(text(), 'Refuse non-essential cookies')]");
    if (refuseCookies.length > 0) {
        await refuseCookies[0].click();
    }
    await delay(2000);
}

(async () => {
    let arguments = process.argv
    let accountName = arguments[2];
    let dolphinProfileID = arguments[3];
    let category = Number(arguments[4]);
    let profileNumber = arguments[5];

    const { port, wsEndpoint } = await dolphin.connect(dolphinProfileID);

    browser = await puppeteer.connect({
        browserWSEndpoint: `ws://127.0.0.1:${port}${wsEndpoint}`
    });

    /*
    browser = await puppeteer.launch({ headless: false });
    */


    let pages = await browser.pages();
    pages.forEach(p => p.close());

    page = await browser.newPage();
    page.setViewport({
        width: 1280,
        height: 800,
        isMobile: false
    });

    const cursor = createCursor(page);

    await page.goto('https://www.twitter.com/login', {waitUntil: 'networkidle2'});

    await login(accountName);

    await refuseCookies();

    const likesDay = 40 - Math.ceil(Math.random() * 5);
    const followsDay = 100 - Math.ceil(Math.random() * 10);
    const dmDay = 50 - Math.ceil(Math.random() * 5);

    let remainingLikes = Math.floor(likesDay / 3);
    let remainingFollows = Math.floor(followsDay / 3);
    let remainingDm = Math.floor(dmDay / 3);

    
    let n = await checkDm(cursor, accountName, browser, page, remainingDm);
    remainingDm -= n;

    /*
    let unfollowed = await unfollowUsers(page, 54);
    console.log(unfollowed)
    */

    
    console.log("Notifications");
    let {liked, sentDm} = await handleNotifications(accountName, browser, page, remainingLikes, remainingDm);
    remainingLikes -= liked;
    remainingDm -= sentDm;

    console.log("Welcome");
    let welcomed = await welcomeNewFollowers(accountName, browser, page, remainingDm);
    remainingDm -= welcomed;
    
    let profileToInteract;

    let profiles = [];
    try {
        let csvContent = readFileSync('./profiles' + profileNumber + '.csv', { encoding: 'utf8', flag: 'r' });
        let arrayProfiles = csvContent.split('\n');
        profiles = arrayProfiles.filter(word => word.length > 0);
    } catch {
    }

    console.log(profiles);

    let lastProfile;
    let indexOfProfile;
    try {
        let csvContent = readFileSync('./' + accountName + '/lastProfileVisited.csv', { encoding: 'utf8', flag: 'r' });
        let arraylastProfile = csvContent.split('\n');
        lastProfile = arraylastProfile.filter(word => word.length > 0);
        lastProfile = lastProfile[0];
        indexOfProfile = (profiles.indexOf(lastProfile) + 1) % profiles.length;
        profileToInteract = profiles[indexOfProfile];
    } catch {
        profileToInteract = profiles[0];
    }

    console.log(profileToInteract);

    while (remainingFollows > 0) {
        let { followCounter, likeCounter } = await interactProfile(accountName, browser, page, profileToInteract, remainingFollows, remainingLikes, 10, category);
        remainingFollows -= followCounter;
        remainingLikes -= likeCounter;
        if (followCounter == 0 && likeCounter == 0) {
            indexOfProfile++;
            profileToInteract = profiles[indexOfProfile];

            // cancel what was written before
            const inputValue = await page.$eval('input[data-testid="SearchBox_Search_Input"]', el => el.value);
            await page.click('input[data-testid="SearchBox_Search_Input"]');
            for (let i = 0; i < inputValue.length; i++) {
                await page.keyboard.press('Backspace');
            }
        }
    }

    let csvContent = profileToInteract;
    try {
        writeFileSync('./' + accountName + '/lastProfileVisited.csv', csvContent);
    } catch (e) {
        console.error(e);
    }

    console.log("Available DMs: " + remainingDm);
    console.log("Available likes: " + remainingLikes);
    console.log("Available follows: " + remainingFollows);
    
    await browser.close();
    
    /*
    let users = await scrapeLikes(browser, page, '@g_goldensoles', 5000);

    console.log(users.size)
    let initials = {}
    users.forEach(element => {
        let lowerCase = element.toLowerCase();
        let initial = lowerCase.charAt(0);
        if (initial in initials) {
            initials[initial] = initials[initial] + 1;
        } else {
            initials[initial] = 1;
        }
    });
    console.log(initials);
    

    /*
    let { followCounter, likeCounter } = await interactProfile(browser, page, "@lehlanichan", 20, 0, 10);
    console.log(followCounter);
    console.log(likeCounter);

    
    await updateFollowings(page);
    let following = await downloadFollowings();
    
    console.log("Thank old users");
    let thanked = await thankInteractions(page, remainingDm);
    remainingDm -= thanked;
    
    console.log("Interact");
    for (let i = 0; i < hashtags.length; i++) {
        await page.click('input[data-testid="SearchBox_Search_Input"]', { clickCount: 3 });
        let {usersFollowed, commentsLiked} = await interactCommentUserByResearch(browser, page, hashtags[i], remainingFollows, remainingLikes);
        remainingFollows -= usersFollowed;
        remainingLikes -= commentsLiked;
        if (remainingFollows <= 0 && remainingLikes <= 0) {
            break;
        }
    }

    console.log("Remaining DMs: " + remainingDm);
    console.log("Remaining likes: " + remainingLikes);
    console.log("Remaining follows: " + remainingFollows);
    */
    //
})();