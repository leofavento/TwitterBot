const delay = require('./utils.js');
const messages = require('./messages.json');
const {
    sendDMToAccount,
    sendDM
} = require('./sendDM.js');
const appendFileSync = require('fs').appendFileSync;
const readFileSync = require('fs').readFileSync;

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

async function checkNotifications(page) {
    let notifications = await page.$('a[data-testid="AppTabBar_Notifications_Link"]');

    let notificationsCount = await notifications.$('span');
    if (notificationsCount === null) {
        return 0;
    }
    notificationsCount = await notificationsCount.evaluate(el => el.textContent, notificationsCount);
    return Number(notificationsCount);
}

async function readNotifications(browser, page, number, numberLikes, numberDm) {
    await delay(1500);

    const notificationsArea = await page.$('div[aria-label="Timeline: Notifications"]');

    let readNotifications = 0

    let liked = 0
    let sentDm = 0
    while (readNotifications < number) {
        const articles = await notificationsArea.$x('//article');
        for (let i = 0; i < articles.length; i++) {
            let typeOfNotification = await recognizeNotification(page, articles[i]);
            console.log(typeOfNotification);
            readNotifications++;

            if (typeOfNotification === "mention") {
                let reacted = await reactToMention(articles[i], liked < numberLikes);
                if (reacted) {
                    liked++;
                }
            } else if (typeOfNotification === "comment") {
                let { reactLike, reactDm } = await reactToComment(browser, page, articles[i], liked < numberLikes, sentDm < numberDm);
                if (reactLike) {
                    liked++;
                }
                if (reactDm) {
                    sentDm++;
                }
            } else if (typeOfNotification === "like") {
                console.log("LIKE");
                let reacted = await reactToLike(browser, page, articles[i], numberDm - sentDm);
                sentDm = sentDm + reacted;
            } else if (typeOfNotification === "multipleLikes") {
                //await reactToMultipleLikes(browser, page, articles[i]);
                // bugged. if the notification is just for one user liking more than 1 post, we could just click on the name of the user and send him the message
            }

            if (readNotifications === number) {
                break
            }
        }
        if (readNotifications === number) {
            break
        }
        await articles[articles.length - 1].scrollIntoView({ behavior: 'smooth', block: 'end', inline: 'end' });
    }
    return { liked, sentDm }
}

async function recognizeNotification(page, article) {
    const attr = await page.evaluate(article => article.getAttribute("data-testid"), article);
    let typeOfNotification;
    if (attr === "tweet") {
        let comment = await article.$('div[class="css-901oao r-14j79pv r-37j5jr r-a023e6 r-16dba41 r-rjixqe r-bcqeeo r-qvutc0"]');
        if (comment === null) {
            typeOfNotification = "mention";
        } else {
            typeOfNotification = "comment";
            /*
            let replying = await article.$eval('div[class="css-901oao r-14j79pv r-37j5jr r-a023e6 r-16dba41 r-rjixqe r-bcqeeo r-qvutc0"]', e => e.innerText);
            console.log(replying);
            */
        }
    } else {
        //let text = await article.$('[class="css-901oao r-18jsvk2 r-37j5jr r-a023e6 r-16dba41 r-rjixqe r-bcqeeo r-1udh08x r-qvutc0"]');
        let text = await article.$eval('div[class="css-901oao r-18jsvk2 r-37j5jr r-a023e6 r-16dba41 r-rjixqe r-bcqeeo r-1udh08x r-qvutc0"]', e => e.innerHTML);
        let showMore = await article.$('a[href="/i/timeline"]');
        if (showMore !== null) {
            typeOfNotification = "multipleLikes";
        } else if (text.includes('<span class="css-901oao css-16my406 r-poiln3 r-bcqeeo r-qvutc0"> followed you</span>')) {
            typeOfNotification = "follow";
        } else if (text.includes('<span class="css-901oao css-16my406 r-poiln3 r-bcqeeo r-qvutc0"> liked your Tweet</span>')) {
            typeOfNotification = "like";
        } else {
            typeOfNotification = "ignore";
        }
    }
    return typeOfNotification;
}

async function reactToMention(article, canLike) {
    let likeButton = await article.$('div[data-testid="like"]');
    let likeProb = Math.random();
    let liked = false
    if (likeButton !== null && likeProb < 0.8 && canLike) {
        await likeButton.click('svg');
        liked = true
    }
    await delay(1000);
    return liked;
}

async function reactToComment(browser, page, article, canLike, canDm) {
    let liked = false
    let sentDm = false
    let engaged = new Set()
    try {
        let csvContent = readFileSync('./' + botName + '/engaged.csv', { encoding: 'utf8', flag: 'r' });
        let arrayEngaged = csvContent.split('\n');
        engaged = new Set(arrayEngaged.filter(word => word.length > 0))
    } catch {
    }

    let likeButton = await article.$('div[data-testid="like"]');
    let likeProb = Math.random();
    if (likeButton !== null && likeProb < 0.8 && canLike) {
        await likeButton.click('svg');
        liked = true
    }
    await delay(1000);

    let avatarUser = await article.$('div[data-testid="Tweet-User-Avatar"]');
    let accountLink = await avatarUser.$('a');
    accountLink = await accountLink.getProperty('href');
    accountLink = await accountLink.jsonValue();

    if (engaged.has(accountLink)) {
        return { liked, sentDm };
    }
    
    await page.hover('a[href="/home"]');
    await delay(1000);
    await avatarUser.click({button: 'middle'});
    await delay(2000);
    let pages = await browser.pages();
    let newPage = pages[pages.length - 1];
    await newPage.bringToFront();
    await delay(1000);

    let respectsLimit = await checkAccountLimits(newPage, accountLink);

    if (respectsLimit === false) {
        await delay(1000);
        console.log("Not good target account");
        await newPage.close();
        await delay(2000);
        return { liked, sentDm }
    }

    if (canDm === false) {
        let userName = accountLink.split('/');
        userName = userName[userName.length - 1];

        try {
            appendFileSync('./' + botName + '/toThank.csv', '@' + userName + '\n');
        } catch (e) {
            console.error(e);
        }

        await delay(1000);
        await newPage.close();
        await delay(2000);
        return { liked, sentDm };
    }
                    
    let msg = messages.comment;

    await sendDMToAccount(newPage, msg[Math.floor(Math.random() * msg.length)]);

    await delay (6000);

    await sendDM(newPage, messages.engage[Math.floor(Math.random() * messages.engage.length)]);

    sentDm = true

    try {
        appendFileSync('./' + botName + '/engaged.csv', accountLink + '\n');
    } catch (e) {
        console.error(e);
    }

    await delay(1000);
    await newPage.close();
    await delay(2000);

    return { liked, sentDm }
}

async function reactToLike(browser, page, article, availableDm) {
    let engaged = new Set()
    try {
        let csvContent = readFileSync('./' + botName + '/engaged.csv', { encoding: 'utf8', flag: 'r' });
        let arrayEngaged = csvContent.split('\n');
        engaged = new Set(arrayEngaged.filter(word => word.length > 0))
    } catch {
    }
    
    await page.hover('a[href="/home"]');
    await delay(1000);
    let textTweet = await article.$('div[data-testid="tweetText"]');
    await textTweet.click({button: 'middle'});
    await delay(2000);
    let pages = await browser.pages();
    let newPage = pages[pages.length - 1];
    await newPage.bringToFront();
    await delay(1000);

    let sensitiveContent = await page.$('div[data-testid="empty_state_button_text"]');
    if (sensitiveContent !== null) {
        sensitiveContent.click();
        await delay(3000);
    }

    let urlTweet = await newPage.url();
    urlTweet = urlTweet.replace('https://twitter.com', '');
    let likesButton = await newPage.$('a[href="' + urlTweet + '/likes"]');
    await likesButton.click();
    await delay(2000);

    const likes = await newPage.$('div[aria-label="Timeline: Liked by"]');
    let users = new Set();
    let sentDm = 0;
    while (true) {
        let initialUsers = users.size;
        const elementHandles = await likes.$x('//div[@data-testid="UserCell"]');

        let links = await Promise.all(
            elementHandles.map(handle => handle.$('a[class="css-4rbku5 css-18t94o4 css-1dbjc4n r-1niwhzg r-1loqt21 r-1pi2tsx r-1ny4l3l r-o7ynqc r-6416eg r-13qz1uu"]'))
        );
        links = links.filter(elements => { return elements !== null; })
        
        for (let i = 0; i < links.length; i++) {
            let accountLink = await links[i].getProperty('href');
            accountLink = await accountLink.jsonValue();
            let userName = accountLink.split('/');
            userName = userName[userName.length - 1];

            if (engaged.has(accountLink)) {
                console.log(accountLink + " already engaged");
                continue
            }

            if (users.has(userName)) {
                continue
            } else {
                users.add(userName);
            }

            await newPage.hover('a[href="/home"]');
            await delay(1000);
            await links[i].click({ button: 'middle' });
            await delay(2000);
            let pages = await browser.pages();
            let newPage2 = pages[pages.length - 1];
            await newPage2.bringToFront();
            await delay(1000);

            let respectsLimit = await checkAccountLimits(newPage2, accountLink);

            if (respectsLimit === false) {
                await delay(1000);
                console.log("Not good target account");
                await newPage2.close();
                await delay(2000);
                continue
            }

            if (sentDm >= availableDm) {
                try {
                    appendFileSync('./' + botName + '/toThank.csv', '@' + userName + '\n');
                } catch (e) {
                    console.error(e);
                }

                await delay(1000);
                await newPage2.close();
                await delay(2000);
                continue
            }
                            
            let msg = messages.comment;

            await sendDMToAccount(newPage2, msg[Math.floor(Math.random() * msg.length)]);

            await delay (6000);

            await sendDM(newPage2, messages.engage[Math.floor(Math.random() * messages.engage.length)]);

            sentDm++;

            try {
                appendFileSync('./' + botName + '/engaged.csv', accountLink + '\n');
            } catch (e) {
                console.error(e);
            }

            await delay(1000);
            await newPage2.close();
            await delay(2000);
        }

        if (users.size == initialUsers) {
            break;
        }

        const selector = '#layers > div:nth-child(2) > div > div > div > div > div > div.css-1dbjc4n.r-1awozwy.r-18u37iz.r-1pi2tsx.r-1777fci.r-1xcajam.r-ipm5af.r-g6jmlv > div.css-1dbjc4n.r-1867qdf.r-1wbh5a2.r-kwpbio.r-rsyp9y.r-1pjcn9w.r-1279nm1.r-htvplk.r-1udh08x > div > div > div > section > div > div > div > div > div:last-child';
        await newPage.$eval(selector, e => {
            e.scrollIntoView({ behavior: 'smooth', block: 'end', inline: 'end' });
        });
                    
        await delay(3000);
    }
    await delay(1000);
    await newPage.close();
    await delay(2000);

    return sentDm;
}

async function reactToMultipleLikes(browser, page, article) {
    let showMore = await article.$('a[href="/i/timeline"]');
    await showMore.click();
    await delay(2000);

    let engaged = new Set()
    try {
        let csvContent = readFileSync('./' + botName + '/engaged.csv', { encoding: 'utf8', flag: 'r' });
        let arrayEngaged = csvContent.split('\n');
        engaged = new Set(arrayEngaged.filter(word => word.length > 0))
    } catch {
    }
    let liked = await page.$('div[aria-label="Timeline: Liked"]');
    let articles = await liked.$x('//article[@data-testid="tweet"]');

    for (let i = 0; i < articles.length; i++) {
        const tweet = await articles[i].$('a[class="css-4rbku5 css-18t94o4 css-901oao r-14j79pv r-1loqt21 r-xoduu5 r-1q142lx r-1w6e6rj r-37j5jr r-a023e6 r-16dba41 r-9aw3ui r-rjixqe r-bcqeeo r-3s2u2q r-qvutc0"]');
        
        await tweet.click({button: 'middle'});
        await delay(2000);
        let pages = await browser.pages();
        let newPage = pages[pages.length - 1];
        await newPage.bringToFront();
        await delay(1000);

        let urlTweet = await newPage.url();
        urlTweet = urlTweet.replace('https://twitter.com', '');
        let likesButton = await newPage.$('a[href="' + urlTweet + '/likes"]');
        await likesButton.click();
        await delay(2000);

        const likes = await newPage.$('div[aria-label="Timeline: Liked by"]');
        let users = new Set();
        while (true) {
            let initialUsers = users.size;
            const elementHandles = await likes.$x('//div[@data-testid="UserCell"]');

            let links = await Promise.all(
                elementHandles.map(handle => handle.$('a[class="css-4rbku5 css-18t94o4 css-1dbjc4n r-1niwhzg r-1loqt21 r-1pi2tsx r-1ny4l3l r-o7ynqc r-6416eg r-13qz1uu"]'))
            );
            links = links.filter(elements => { return elements !== null; })
            
            for (let i = 0; i < links.length; i++) {
                let accountLink = await links[i].getProperty('href');
                accountLink = await accountLink.jsonValue();
                let userName = accountLink.split('/');
                userName = userName[userName.length - 1];

                if (engaged.has(accountLink)) {
                    console.log(accountLink + " already engaged");
                    continue
                }

                if (users.has(userName)) {
                    continue
                } else {
                    users.add(userName);
                }

                await newPage.hover('a[href="/home"]');
                await delay(1000);
                await links[i].click({ button: 'middle' });
                await delay(2000);
                let pages = await browser.pages();
                let newPage2 = pages[pages.length - 1];
                await newPage2.bringToFront();
                await delay(1000);

                let respectsLimit = await checkAccountLimits(newPage2, accountLink);

                if (respectsLimit === false) {
                    await delay(1000);
                    console.log("Not good target account");
                    await newPage2.close();
                    await delay(2000);
                    continue
                }
                                
                let msg = messages.comment;

                await sendDMToAccount(newPage2, msg[Math.floor(Math.random() * msg.length)]);

                await delay(6000);

                await sendDM(newPage2, messages.engage[Math.floor(Math.random() * messages.engage.length)]);

                try {
                    appendFileSync('./' + botName + '/engaged.csv', accountLink + '\n');
                } catch (e) {
                    console.error(e);
                }

                await delay(1000);
                await newPage2.close();
                await delay(2000);
            }

            if (users.size == initialUsers) {
                break;
            }

            const selector = '#layers > div:nth-child(2) > div > div > div > div > div > div.css-1dbjc4n.r-1awozwy.r-18u37iz.r-1pi2tsx.r-1777fci.r-1xcajam.r-ipm5af.r-g6jmlv > div.css-1dbjc4n.r-1867qdf.r-1wbh5a2.r-kwpbio.r-rsyp9y.r-1pjcn9w.r-1279nm1.r-htvplk.r-1udh08x > div > div > div > section > div > div > div > div > div:last-child';
            await newPage.$eval(selector, e => {
                e.scrollIntoView({ behavior: 'smooth', block: 'end', inline: 'end' });
            });
                        
            await delay(3000);
        }
        await delay(1000);
        await newPage.close();
        await delay(2000);
    }
    let goBack = await page.$('div[data-testid="app-bar-back"]');
    await goBack.click();
    await delay(1000);
}

async function handleNotifications(name, browser, page, numberLikes, numberDm) {
    botName = name;

    let numberOfNotifications = await checkNotifications(page);

    if (numberOfNotifications === 0) {
        return
    }

    await delay(2000);
    await page.click('a[data-testid="AppTabBar_Notifications_Link"]');

    let { liked, sentDm } = await readNotifications(browser, page, numberOfNotifications, numberLikes, numberDm);
    return { liked, sentDm };
}

module.exports = handleNotifications;