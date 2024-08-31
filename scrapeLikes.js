const delay = require('./utils.js');
const appendFileSync = require('fs').appendFileSync;
const readFileSync = require('fs').readFileSync;

async function scrapeLikes(browser, page, profileName, numberUsers) {
    await page.waitForSelector('[data-testid="SearchBox_Search_Input"]');
    await page.type('input[data-testid="SearchBox_Search_Input"]', profileName, {delay: 90 + Math.random() * 60});
    await delay(1000);

    let profileClick = await page.$('div[data-testid="UserAvatar-Container-' + profileName.substring(1) + '"]');
    if (profileClick === null) {
        return;
    }
    await profileClick.click();

    await delay(3000);

    let sensitiveContent = await page.$('div[data-testid="empty_state_button_text"]');
    if (sensitiveContent !== null) {
        sensitiveContent.click();
        await delay(3000);
    }

    let tweetAnalysed = new Set();
    try {
        let csvContent = readFileSync('./tweetAnalysed.csv', { encoding: 'utf8', flag: 'r' });
        let arrayTweets = csvContent.split('\n');
        tweetAnalysed = new Set(arrayTweets.filter(word => word.length > 0))
    } catch {
    }

    let users = new Set();
    // while time limit is respected and we still can follow users
    while (users.size < numberUsers) {
        await page.waitForSelector('[data-testid="tweet"]');
        const posts = await page.$x('//article[@data-testid="tweet"]');

        for (let i = 0; i < posts.length; i++) {
            if (users.size >= numberUsers) {
                break;
            }

            const tweet = await posts[i].$('a[class="css-4rbku5 css-18t94o4 css-901oao r-14j79pv r-1loqt21 r-xoduu5 r-1q142lx r-1w6e6rj r-37j5jr r-a023e6 r-16dba41 r-9aw3ui r-rjixqe r-bcqeeo r-3s2u2q r-qvutc0"]');

            let linkComment;
            try {
                linkComment = await tweet.getProperty('href');
                linkComment = await linkComment.jsonValue();
            } catch (e) {
                break;
            }

            if (tweetAnalysed.has(linkComment)) {
                continue;
            } else {
                try {
                    tweetAnalysed.add(linkComment);
                    appendFileSync('./tweetAnalysed.csv', linkComment + '\n');
                } catch (e) {
                    console.error(e);
                }
            }

            let pinnedOrRetween = await posts[i].$('[data-testid="socialContext"]');
            
            if (pinnedOrRetween !== null) {
                continue;
            }

            try {
                await tweet.scrollIntoView({ behavior: 'smooth', block: 'end', inline: 'end' });
                await delay(1000);
                await tweet.click({button: 'middle'});
            } catch (e) {
                console.error(e);
                continue;
            }
            await delay(2000);
            let pages = await browser.pages();
            let newPage = pages[pages.length - 1];

            await newPage.bringToFront();
                
            await delay(3000);
            
            let urlTweet = await newPage.url();
            urlTweet = urlTweet.replace('https://twitter.com', '');
            let likesButton = await newPage.$('a[href="' + urlTweet + '/likes"]');
            if (likesButton === null) {
                await newPage.close();
                await delay(2000);
                continue;
            }
            await likesButton.click();
            await delay(2000);

            const likes = await newPage.$('div[aria-label="Timeline: Liked by"]');
            try {
                while (users.size < numberUsers) {
                    let initialUsers = users.size;
                    const usersLiked = await likes.$x('//div[@data-testid="UserCell"]');
                    //const usersLiked = await likes.$x('//div[@data-testid="cellInnerDiv"]');
                    
                    for (const user of usersLiked) {
                        await delay(100);
                        /*
                        const selector = '#layers > div:nth-child(2) > div > div > div > div > div > div.css-1dbjc4n.r-1awozwy.r-18u37iz.r-1pi2tsx.r-1777fci.r-1xcajam.r-ipm5af.r-g6jmlv > div.css-1dbjc4n.r-1867qdf.r-1wbh5a2.r-kwpbio.r-rsyp9y.r-1pjcn9w.r-1279nm1.r-htvplk.r-1udh08x > div > div > div > section > div > div > div > div > div:nth-child(' + countUser + ')';
                        await newPage.$eval(selector, e => {
                            e.scrollIntoView({ behavior: 'smooth', block: 'end', inline: 'end' });
                        });
                        */
                        let link = await user.$('a[class="css-4rbku5 css-18t94o4 css-1dbjc4n r-1niwhzg r-1loqt21 r-1pi2tsx r-1ny4l3l r-o7ynqc r-6416eg r-13qz1uu"]');
                        link = await link.getProperty('href');
                        link = await link.jsonValue();
                        let userName = link.split('/');
                        userName = userName[userName.length - 1];
                        if (users.size >= numberUsers) {
                            break;
                        }
                        if (users.has(userName)) {
                            continue;
                        }
                        users.add(userName);
                    }

                    if (users.size == initialUsers || users.size >= numberUsers) {
                        break;
                    }

                    const selector = '#layers > div:nth-child(2) > div > div > div > div > div > div.css-1dbjc4n.r-1awozwy.r-18u37iz.r-1pi2tsx.r-1777fci.r-1xcajam.r-ipm5af.r-g6jmlv > div.css-1dbjc4n.r-1867qdf.r-1wbh5a2.r-kwpbio.r-rsyp9y.r-1pjcn9w.r-1279nm1.r-htvplk.r-1udh08x > div > div > div > section > div > div > div > div > div:last-child';
                    
                    await newPage.$eval(selector, e => {
                        e.scrollIntoView({ behavior: 'smooth', block: 'end', inline: 'end' });
                    });
                    
                    await delay(2000);
                }
            } catch(e) {
                console.error(e);
            }
            await delay(2000);
            console.log(users.size);
            await newPage.close();
        }

        try {
            await posts[posts.length - 1].scrollIntoView({ behavior: 'smooth', block: 'end', inline: 'end' });
        } catch (e) {
            
        }
        await delay(2000);
    }
    return users;
}

module.exports = scrapeLikes;