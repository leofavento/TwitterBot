const delay = require('./utils.js');
const follow = require('./follow.js');
const writeFileSync = require('fs').writeFileSync;
const readFileSync = require('fs').readFileSync;

/*
async function getPostUserByResearch(page, keyword, minNumber, currentFollowing) {
    await page.waitForSelector('[data-testid="SearchBox_Search_Input"]');
    await page.type('input[data-testid="SearchBox_Search_Input"]', keyword, {delay: 90 + Math.random() * 60});
    await page.keyboard.press('Enter');
    await delay(2000);

    console.log("Retrieving " + minNumber + " accounts to follow...");

    let users = new Set()
    try {
        let previousHeight;
        while (users.size < minNumber) {
            const elementHandles = await page.$x('//*[@data-testid="Tweet-User-Avatar"]');
            
            let links = await Promise.all(
                elementHandles.map(handle => handle.$('a'))
            );
            links = links.filter(elements => { return elements !== null; })
            
            const propertyJsHandles = await Promise.all(
                links.map(handle => handle.getProperty('href'))
            );
            const urls = await Promise.all(
                propertyJsHandles.map(handle => handle.jsonValue())
            );

            //urls.forEach(item => users.add(item))

            urls.forEach(function(item) {
                if (! (currentFollowing.has(item))) {
                    users.add(item);
                }
            });

            previousHeight = await page.evaluate('document.body.scrollHeight');
            await page.evaluate('window.scrollTo(0, document.body.scrollHeight)');
            await page.waitForFunction(`document.body.scrollHeight > ${previousHeight}`, {timeout: 10000});
            await delay(2000);
        }
        console.log("Operation complete.");
    } catch(e) { 
        console.error("Couldn't find " + minNumber + " users for keyword " + keyword)
    }
    return users
}

async function followLikeCommentUserByResearch(browser, page, keyword, minNumber, currentFollowing) {
    await page.waitForSelector('[data-testid="SearchBox_Search_Input"]');
    await page.type('input[data-testid="SearchBox_Search_Input"]', keyword, {delay: 90 + Math.random() * 60});
    await page.keyboard.press('Enter');
    await delay(2000);

    console.log("Retrieving " + minNumber + " suitable users from posts with keyword " + keyword + "...");

    let users = new Set()
    try {
        let previousHeight;
        while (users.size < minNumber) {
            await page.waitForSelector('[data-testid="tweet"]');
            const posts = await page.$x('//article[@data-testid="tweet"]');
            
            for (let i = 0; i < posts.length; i++) {
                const tweet = await posts[i].$('a[class="css-4rbku5 css-18t94o4 css-901oao r-14j79pv r-1loqt21 r-xoduu5 r-1q142lx r-1w6e6rj r-37j5jr r-a023e6 r-16dba41 r-9aw3ui r-rjixqe r-bcqeeo r-3s2u2q r-qvutc0"]');
            
                const promotion = await posts[i].$('svg[class="r-14j79pv r-4qtqp9 r-yyyyoo r-1q142lx r-ip8ujx r-1d4mawv r-dnmrzs r-bnwqim r-1plcrui r-lrvibr"]');
                if (promotion !== null) {
                    continue;
                }
                await delay(1500);
                const newPage = await browser.newPage();
                let href = await tweet.getProperty('href')
                let link = await href.jsonValue();
                
                await newPage.goto(link, {waitUntil: 'networkidle2'});
                await newPage.bringToFront();
                
                await delay(3000);

                // accounts that commented the post
                let toFollow = new Set();
                while (users.size < minNumber) {
                    let initialUsers = users.size;
                    const elementHandles = await newPage.$x('//*[@data-testid="Tweet-User-Avatar"]');
                
                    let links = await Promise.all(
                        elementHandles.map(handle => handle.$('a'))
                    );
                    links = links.filter(elements => { return elements !== null; })
                    
                    const propertyJsHandles = await Promise.all(
                        links.map(handle => handle.getProperty('href'))
                    );
                    const urls = await Promise.all(
                        propertyJsHandles.map(handle => handle.jsonValue())
                    );

                    urls.forEach(function(item) {
                        if (! (currentFollowing.has(item))) {
                            users.add(item);
                            toFollow.add(item);
                        }
                    });

                    console.log(users.size + " users found...");

                    if (users.size == initialUsers) {
                        break;
                    }

                    await newPage.evaluate('window.scrollTo(0, document.body.scrollHeight)');
                    await delay(2000);
                                                        
                    const showMore = await newPage.$('div[class="css-18t94o4 css-1dbjc4n r-1777fci r-1pl7oy7 r-1ny4l3l r-o7ynqc r-6416eg r-13qz1uu"]');
                    if (showMore !== null) {
                        await delay(2000);
                        await showMore.click();
                    }                                    
                    const showOffensive = await newPage.$('div[class="css-1dbjc4n r-1awozwy r-x572qd r-jxzhtn r-1867qdf r-1phboty r-rs99b7 r-18u37iz r-1wtj0ep r-s1qlax r-1f1sjgu"]');
                    if (showOffensive !== null) {
                        const button = await showOffensive.$x("//span[contains(text(), 'Show')]");
                        await delay(2000);
                        await button[1].click();
                    }
                    await delay(3000);
                }
                follow.followUsers(toFollow);
                if (users.size >= minNumber) {
                    await page.bringToFront();
                    await newPage.close();
                    break;
                }

                await newPage.goto(link + '/likes', {waitUntil: 'networkidle2'});
                await delay(3000);

                // accounts that liked the post
                toFollow = new Set();
                const likes = await newPage.$('div[aria-label="Timeline: Liked by"]');
                while (users.size < minNumber) {
                    let initialUsers = users.size;
                    const elementHandles = await likes.$x('//div[@data-testid="UserCell"]');
                
                    let links = await Promise.all(
                        elementHandles.map(handle => handle.$('a[class="css-4rbku5 css-18t94o4 css-1dbjc4n r-1niwhzg r-1loqt21 r-1pi2tsx r-1ny4l3l r-o7ynqc r-6416eg r-13qz1uu"]'))
                    );
                    links = links.filter(elements => { return elements !== null; })
                    
                    const propertyJsHandles = await Promise.all(
                        links.map(handle => handle.getProperty('href'))
                    );
                    const urls = await Promise.all(
                        propertyJsHandles.map(handle => handle.jsonValue())
                    );

                    urls.forEach(function(item) {
                        if (! (currentFollowing.has(item))) {
                            users.add(item);
                            toFollow.add(item);
                        }
                    });

                    console.log(users.size + " users found...");

                    if (users.size == initialUsers) {
                        break;
                    }

                    const selector = '#layers > div:nth-child(2) > div > div > div > div > div > div.css-1dbjc4n.r-1awozwy.r-18u37iz.r-1pi2tsx.r-1777fci.r-1xcajam.r-ipm5af.r-g6jmlv > div.css-1dbjc4n.r-1867qdf.r-1wbh5a2.r-kwpbio.r-rsyp9y.r-1pjcn9w.r-1279nm1.r-htvplk.r-1udh08x > div > div > div > section > div > div > div > div > div:last-child';
                    await newPage.$eval(selector, e => {
                        e.scrollIntoView({ behavior: 'smooth', block: 'end', inline: 'end' });
                    });
                    
                    //await page.mouse.wheel({deltaY: -100});
                    await delay(3000);
                }
                follow.followUsers(toFollow);
                if (users.size >= minNumber) {
                    await page.bringToFront();
                    await newPage.close();
                    break;
                }
                
                await page.bringToFront();
                await newPage.close();
            }
            previousHeight = await page.evaluate('document.body.scrollHeight');
            await page.evaluate('window.scrollTo(0, document.body.scrollHeight)');
            await page.waitForFunction(`document.body.scrollHeight > ${previousHeight}`, {timeout: 10000});
            await delay(4000);
        }
        console.log("Operation complete.");
    } catch(e) { 
        console.error("Couldn't find " + minNumber + " users for keyword " + keyword)
        console.error(e)
    }
    return users
}

async function followLikeCommentUserFromList(browser, page, keywords, minNumber, currentFollowing) {
    let users = new Set()
    for (i = 0; i < keywords.length; i++) {
        let newUsers = await followLikeCommentUserByResearch(browser, page, keywords[i], minNumber - users.size, currentFollowing);
        users = new Set([...users, ...newUsers]);
        if (users.size >= minNumber) {
            break;
        }
    }
    //return users;
}
*/

// returns number of users that we followed (we aren't keeping track of the number of likes we put - it will be more or less the same number)
async function interactCommentUserByResearch(browser, page, keyword, numberFollows, numberLikes) {
    await page.waitForSelector('[data-testid="SearchBox_Search_Input"]');
    await page.type('input[data-testid="SearchBox_Search_Input"]', keyword, {delay: 90 + Math.random() * 60});
    await delay(500);
    await page.keyboard.press('Enter');
    await delay(2000);

    let commentsAnalysed = new Set();
    try {
        let csvContent = readFileSync('./tweetAnalysed.csv', { encoding: 'utf8', flag: 'r' });
        let arrayComments = csvContent.split('\n');
        commentsAnalysed = new Set(arrayComments.filter(word => word.length > 0))
    } catch {
    }

    let usersFollowed = 0;
    let commentsLiked = 0;
    try {
        let previousHeight;
        while (usersFollowed < numberFollows || commentsLiked < numberLikes) {
            await page.waitForSelector('[data-testid="tweet"]');
            const posts = await page.$x('//article[@data-testid="tweet"]');
            
            for (let i = 0; i < posts.length; i++) {
                const tweet = await posts[i].$('a[class="css-4rbku5 css-18t94o4 css-901oao r-14j79pv r-1loqt21 r-xoduu5 r-1q142lx r-1w6e6rj r-37j5jr r-a023e6 r-16dba41 r-9aw3ui r-rjixqe r-bcqeeo r-3s2u2q r-qvutc0"]');
                                                    
                const promotion = await posts[i].$('svg[class="r-14j79pv r-4qtqp9 r-yyyyoo r-1q142lx r-ip8ujx r-1d4mawv r-dnmrzs r-bnwqim r-1plcrui r-lrvibr"]');
                if (promotion !== null) {
                    continue;
                }
                await delay(1500);

                try {
                    await tweet.click({button: 'middle'});
                } catch (e) {
                    console.error(e);
                    continue;
                }
                await delay(2000);
                let pages = await browser.pages();
                let newPage = pages[pages.length - 1];

                /*
                const newPage = await browser.newPage();
                let href = await tweet.getProperty('href')
                let link = await href.jsonValue();
                
                await newPage.goto(link, {waitUntil: 'networkidle2'});
                */
                await newPage.bringToFront();
                
                await delay(3000);

                // accounts that commented the post
                while (usersFollowed < numberFollows || commentsLiked < numberLikes) {
                    let initialComments = commentsAnalysed.size;
                    const conversation = await newPage.$('div[aria-label="Timeline: Conversation"]');

                    const commentsScraped = await conversation.$x('//article[@data-testid="tweet"]');

                    for (const comment of commentsScraped) {
                        let add = true
                        let titleComment = await comment.$('div[data-testid="User-Name"]');
                        let links = await titleComment.$x('//a');
                        
                        if (links.length < 3) { // we don't consider the original post, only the comments
                            continue;
                        }
                        let linkComment = links[2];
                        linkComment = await linkComment.getProperty('href');
                        linkComment = await linkComment.jsonValue();
                        for (const already of commentsAnalysed) {
                            if (linkComment === already) {
                                add = false;
                                break;
                            }
                        }
                        if (add === true) {
                            let { followed, liked } = await interactWithComment(browser, newPage, comment, usersFollowed < numberFollows, commentsLiked < numberLikes);
                            commentsAnalysed.add(linkComment); // add the comment to the list since i've already seen it (won't interact with it if we find it again)
                            if (followed === true) {
                                usersFollowed++;
                            }
                            if (liked === true) {
                                commentsLiked++;
                            }
                        }
                    }

                    if (commentsAnalysed.size == initialComments) {
                        break;
                    }

                    //await newPage.evaluate('window.scrollTo(0, document.body.scrollHeight)');
                    await newPage.evaluate(() => {
                        window.scrollBy(0, 2 * document.body.clientHeight);
                    });
                    await delay(2000);
                                                        
                    const showMore = await newPage.$('div[class="css-18t94o4 css-1dbjc4n r-1777fci r-1pl7oy7 r-1ny4l3l r-o7ynqc r-6416eg r-13qz1uu"]');
                    if (showMore !== null) {
                        await showMore.click();
                        await delay(2000);
                    }                                    
                    const showOffensive = await newPage.$('div[class="css-1dbjc4n r-1awozwy r-x572qd r-jxzhtn r-1867qdf r-1phboty r-rs99b7 r-18u37iz r-1wtj0ep r-s1qlax r-1f1sjgu"]');
                    if (showOffensive !== null) {
                        const button = await showOffensive.$x("//span[contains(text(), 'Show')]");
                        try {
                            await button[1].click();
                            await delay(2000);
                        } catch (e) {

                        }
                    }
                    await delay(3000);
                }
                

                if (usersFollowed >= numberFollows && commentsLiked >= numberLikes) {
                    await page.bringToFront();
                    await newPage.close();
                    break;
                }

                await page.bringToFront();
                await newPage.close();
            }
            previousHeight = await page.evaluate('document.body.scrollHeight');
            await page.evaluate('window.scrollTo(0, document.body.scrollHeight)');
            await page.waitForFunction(`document.body.scrollHeight > ${previousHeight}`, {timeout: 10000});
            await delay(4000);
        }
        console.log("Operation complete.");
    } catch(e) {
        console.log("Couldn't complete all requested operations");
        console.error(e)
    }

    let csvContent = ''
    commentsAnalysed.forEach(el => {
        csvContent += el + '\n'
    });
    try {
        writeFileSync('./tweetAnalysed.csv', csvContent);
    } catch (e) {
        console.error(e);
    }
    
    return { usersFollowed, commentsLiked };
}

async function interactWithComment(browser, page, comment, canFollow, canLike) {
    let followed = false
    let liked = false
    let textComment = await comment.$('div[data-testid="tweetText"]');
    try {
        textComment = await textComment.evaluate(el => el.textContent, textComment);
    } catch (e) {
        textComment = "";
    }
    let numberOfWords = textComment.split(' ').length;


    // time of reading the comment
    await delay(2000);

    // calculate the probability of putting a like on a comment (0% if < 5 words, 80% if >= 15 words, linear interpolation between 5 and 15
    let probability = 0;
    if (numberOfWords >= 15) {
        probability = 0.8;
    } else if (numberOfWords > 5 && numberOfWords < 15) {
        probability = 0.04 * numberOfWords + 0.2;
    }
    let likeProb = Math.random();
    let followProb = Math.random();
    try {
        if (likeProb < probability && canLike) {
            let likeButton = await comment.$('div[data-testid="like"]');
            if (likeButton !== null) {
                const numOfLikes = await (await likeButton.getProperty('textContent')).jsonValue();
                if (Number(numOfLikes) < 5) {
                    await likeButton.click();
                    liked = true;
                }
            }
            await delay(1000);
        }
        if (followProb < probability && canFollow) {
            let avatar = await comment.$('div[data-testid="Tweet-User-Avatar"]');
            let linkAccount  = await avatar.$('a');
            linkAccount = await linkAccount.getProperty('href');
            linkAccount = await linkAccount.jsonValue();

            // after clicking on a profile image, the popup appears and it can cause errors when trying to click on other things later
            // so we hover on the twitter logo to let the popup disappear: does the job but could potentially cause detection by antibot systems
            await page.hover('a[href="/home"]');
            await delay(1000);

            await avatar.click({ button: 'middle' });
            await delay(2000);
            let pages = await browser.pages();
            await pages[pages.length - 1].bringToFront();
            await delay(1000);
            followed = await follow.follow(pages[pages.length - 1], linkAccount);
            await delay(1000);
            await pages[pages.length - 1].close();
            


            /*
            const newPage = await browser.newPage();
            await newPage.goto(linkAccount, {waitUntil: 'networkidle2'});
            await newPage.bringToFront();
            await follow.follow(newPage, new Set([linkAccount]), 0);
            await newPage.close();
            */
            await delay(2000);
        }
    } catch (e) {
        console.log(e);
    }
    await delay(3000);
    return { followed, liked };
}

module.exports = interactCommentUserByResearch;