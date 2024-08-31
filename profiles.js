const delay = require('./utils.js');
const appendFileSync = require('fs').appendFileSync;
const readFileSync = require('fs').readFileSync;

let botName;

async function interactProfile(name, browser, page, profileName, numberFollows, numberLikes, timeLimitMinutes, category) {
    botName = name;
    let followCounter = 0;
    let likeCounter = 0;

    await page.waitForSelector('a[data-testid="AppTabBar_Explore_Link"]');
    await delay(1000);
    let exploreLink = await page.$('a[data-testid="AppTabBar_Explore_Link"]');
    await exploreLink.click();
    await delay(2000);

    await page.waitForSelector('[data-testid="SearchBox_Search_Input"]');
    await page.type('input[data-testid="SearchBox_Search_Input"]', profileName, {delay: 90 + Math.random() * 60});
    await delay(3000);

    let profileClick = await page.$('div[data-testid="UserAvatar-Container-' + profileName.substring(1) + '"]');
    if (profileClick === null) {
        console.log("PROFILE NOT FOUND: REMOVE " + profileName + " FROM PROFILES LIST");
        return { followCounter, likeCounter }
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
        let csvContent = readFileSync('./' + botName + '/tweetAnalysed.csv', { encoding: 'utf8', flag: 'r' });
        let arrayTweets = csvContent.split('\n');
        tweetAnalysed = new Set(arrayTweets.filter(word => word.length > 0))
    } catch {
    }

    let start = Date.now();
    let timeLimitSeconds = timeLimitMinutes * 60;
    
    let commentsSeen = new Set();
    // while time limit is respected and we still can follow users
    while (Math.floor((Date.now() - start) / 1000) < timeLimitSeconds && followCounter < numberFollows) {
        await page.waitForSelector('[data-testid="tweet"]');
        const posts = await page.$x('//article[@data-testid="tweet"]');

        for (let i = 0; i < posts.length; i++) {
            if (Math.floor((Date.now() - start) / 1000) >= timeLimitSeconds || followCounter >= numberFollows) {
                break;
            }

            const tweet = await posts[i].$('a[class="css-4rbku5 css-18t94o4 css-901oao r-14j79pv r-1loqt21 r-xoduu5 r-1q142lx r-1w6e6rj r-37j5jr r-a023e6 r-16dba41 r-9aw3ui r-rjixqe r-bcqeeo r-3s2u2q r-qvutc0"]');

            if (tweet === null) {
                continue;
            }

            let linkComment = await tweet.getProperty('href');
            linkComment = await linkComment.jsonValue();

            if (tweetAnalysed.has(linkComment)) {
                continue;
            } else {
                try {
                    tweetAnalysed.add(linkComment);
                    appendFileSync('./' + botName + '/tweetAnalysed.csv', linkComment + '\n');
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

            try {
                while (likeCounter < numberLikes) {
                    let showedMore = false;
                    let initialComments = commentsSeen.size;
                    const conversation = await newPage.$('div[aria-label="Timeline: Conversation"]');

                    const cellInnerDiv = await conversation.$x('//div[@data-testid="cellInnerDiv"]');

                    for (cell of cellInnerDiv) {
                        const showMore = await cell.$('div[role="button"]');

                        if (showMore !== null) {
                            const textOfButton = await (await showMore.getProperty('textContent')).jsonValue();
                            if (textOfButton === "Show more replies" || textOfButton === "Show replies") {
                                await delay(500);
                                await showMore.click();
                                showedMore = true;
                                await delay(1500);
                                break;
                            }
                        }

                        const discoverMore = await cell.$('h2[role="heading"]');

                        if (discoverMore !== null) {
                            break;
                        }

                        const comment = await cell.$('article[data-testid="tweet"]');

                        if (comment === null) {
                            continue;
                        }
                        
                        let titleComment = await comment.$('div[data-testid="User-Name"]');
                        let links = await titleComment.$x('//a');
                                
                        if (links.length < 3) { // we don't consider the original post, only the comments
                            continue;
                        }
                        let linkComment = links[2];
                        linkComment = await linkComment.getProperty('href');
                        linkComment = await linkComment.jsonValue();
                        if (commentsSeen.has(linkComment)) {
                            continue;
                        } else {
                            let liked = await interactWithComment(comment, likeCounter < numberLikes, category);
                            if (liked) {
                                likeCounter++;
                            }
                            commentsSeen.add(linkComment); // add the comment to the list since i've already seen it (won't interact with it if we find it again)
                        }

                        if (likeCounter === numberLikes) {
                            break;
                        }
                    }

                    if (commentsSeen.size == initialComments && showedMore == false) {
                        break;
                    }

                    if (showedMore === false) {
                        await cellInnerDiv[cellInnerDiv.length - 1].scrollIntoView({ behavior: 'smooth', block: 'end', inline: 'end' });
                        await delay(1500);
                    }
                }
            } catch (e) {
                console.error(e);
            }
            await delay(1000);

            await newPage.evaluate('window.scrollTo(0, 0)');

            await delay(1000);
            
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
            let usersSeen = new Set();
            let countUser = 0;
            try {
                while (Math.floor((Date.now() - start) / 1000) < timeLimitSeconds && followCounter < numberFollows) {
                    let initialUsers = usersSeen.size;
                    //const usersLiked = await likes.$x('//div[@data-testid="UserCell"]');
                    const usersLiked = await likes.$x('//div[@data-testid="cellInnerDiv"]');
                    
                    for (const user of usersLiked) {
                        try {
                            let link = await user.$('a[class="css-4rbku5 css-18t94o4 css-1dbjc4n r-1niwhzg r-1loqt21 r-1pi2tsx r-1ny4l3l r-o7ynqc r-6416eg r-13qz1uu"]');
                            if (link === null) {
                                continue;
                            }
                            link = await link.getProperty('href');
                            link = await link.jsonValue();
                            if (followCounter >= numberFollows || Math.floor((Date.now() - start) / 1000) >= timeLimitSeconds) {
                                break;
                            }
                            if (usersSeen.has(link)) {
                                continue;
                            }
                            countUser++;
                            await delay(1000);
                            //const selector = '#layers > div:nth-child(2) > div > div > div > div > div > div.css-1dbjc4n.r-1awozwy.r-18u37iz.r-1pi2tsx.r-1777fci.r-1xcajam.r-ipm5af.r-g6jmlv > div.css-1dbjc4n.r-1867qdf.r-1wbh5a2.r-kwpbio.r-rsyp9y.r-1pjcn9w.r-1279nm1.r-htvplk.r-1udh08x > div > div > div > section > div > div > div > div > div:nth-child(' + countUser + ')';
                            const selector = await getCSSSelector(user);
                            await newPage.$eval(selector, e => {
                                e.scrollIntoView({ behavior: 'smooth', block: 'end', inline: 'end' });
                            });
                            await delay(300);
                            let followed = await checkUser(user, category);
                            if (followed) {
                                followCounter++;
                            }
                            usersSeen.add(link);
                        } catch (e) {
                            console.error(e);
                        }
                    }

                    if (usersSeen.size == initialUsers || followCounter >= numberFollows || Math.floor((Date.now() - start) / 1000) >= timeLimitSeconds) {
                        break;
                    }

                    /*
                    const selector = '#layers > div:nth-child(2) > div > div > div > div > div > div.css-1dbjc4n.r-1awozwy.r-18u37iz.r-1pi2tsx.r-1777fci.r-1xcajam.r-ipm5af.r-g6jmlv > div.css-1dbjc4n.r-1867qdf.r-1wbh5a2.r-kwpbio.r-rsyp9y.r-1pjcn9w.r-1279nm1.r-htvplk.r-1udh08x > div > div > div > section > div > div > div > div > div:last-child';
                    
                    await newPage.$eval(selector, e => {
                        e.scrollIntoView({ behavior: 'smooth', block: 'end', inline: 'end' });
                    });
                    */
                    
                    await delay(2000);
                }
            } catch (e) {
                console.error(e);
            }
            await delay(2000);
            await newPage.close();
        }

        await posts[posts.length - 1].scrollIntoView({ behavior: 'smooth', block: 'end', inline: 'end' });
        await delay(2000);
    }
    return { followCounter, likeCounter }
}

async function interactWithComment(comment, canLike, category) {
    let liked = false
    let textComment = await comment.$('div[data-testid="tweetText"]');
    try {
        textComment = await textComment.evaluate(el => el.textContent, textComment);
    } catch (e) {
        textComment = "";
    }
    let numberOfWords = textComment.split(' ').length;

    let userName = await comment.$('div[data-testid="User-Name"]');
    userName = await userName.$('a');
    userName = await userName.getProperty('href');
    userName = await userName.jsonValue();
    userName = userName.split('/');
    userName = userName[userName.length - 1];

    if (!checkFirstLetterCategory(userName, category)) {
        return false;
    }

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
            await delay(3000);
        }
    } catch (e) {
        console.log(e);
    }
    await delay(1000);
    return liked;
}

async function checkUser(user, category) {
    let profilePic = await user.$('img');

    let picSrc = await profilePic.getProperty('src');
    picSrc = await picSrc.jsonValue();

    // default profile photo
    if (picSrc === "https://abs.twimg.com/sticky/default_profile_images/default_profile_normal.png") {
        return false;
    }

    // no verified accounts
    let verified = await user.$('svg[data-testid="icon-verified"]');
    if (verified !== null) {
        return false;
    }
    

    let textBio = await user.$('div > div.css-1dbjc4n.r-1iusvr4.r-16y2uox > div.css-901oao.r-18jsvk2.r-37j5jr.r-a023e6.r-16dba41.r-rjixqe.r-bcqeeo.r-1h8ys4a.r-1jeg54m.r-qvutc0 > span');
    // no bio    
    if (textBio === null) {
        return false;
    }
    textBio = await (await textBio.getProperty('textContent')).jsonValue();

    let bannedWords = new Set(["buy", "sell", "onlyfans", "paypal"]);

    /*
    let words = textBio.split(' ');
    words.forEach(element => {
        if (bannedWords.has(element.toLowerCase())) {
            return false;
        }
    });
    */

    for (const word of bannedWords) {
        if (textBio.includes(word)) {
            return false;
        }
    }

    let userCell = await user.$('div[data-testid="UserCell"]');

    let link = await userCell.$('a[class="css-4rbku5 css-18t94o4 css-1dbjc4n r-1niwhzg r-1loqt21 r-1pi2tsx r-1ny4l3l r-o7ynqc r-6416eg r-13qz1uu"]');
    link = await link.getProperty('href');
    link = await link.jsonValue();
    let userName = link.split('/');
    userName = userName[userName.length - 1];

    if (!checkFirstLetterCategory(userName, category)) {
        return false;
    }

    let button = await userCell.$('div[role="button"]');
    let textButton = await (await button.getProperty('textContent')).jsonValue();

    if (textButton === "Follow" && button !== null) {
        await button.click();
        await delay(1000);
    } else {
        return false;
    }
    return true
}

function checkFirstLetterCategory(username, category) {
    if (category === 0) {
        return true;
    }

    const categories = {
      1: ['e', 'i', 'l', 's', 'y'],
      2: ['c', 'k', 'm', 'v', ...Array.from({ length: 10 }, (_, i) => i.toString())],
      3: ['a', 'b', 'o', 'p', 'w', 'x'],
      4: ['d', 'f', 'g', 'h', 'q', 'u'],
      5: ['j', 'n', 'r', 't', 'z', '_']
    };
  
    const firstLetter = username.charAt(0).toLowerCase();
    const selectedCategory = categories[category];
  
    return selectedCategory.includes(firstLetter);
  }

async function getCSSSelector(element) {
    const cssSelector = await element.evaluate((el) => {
      const parts = [];
      for (; el && el.nodeType === Node.ELEMENT_NODE; el = el.parentNode) {
        let label = el.nodeName.toLowerCase();
        if (el.id) {
          parts.unshift(`#${el.id}`);
          break;
        } else {
          let className = el.className.trim();
          if (className) {
            className = className.replace(/\s+/g, ".");
            parts.unshift(`.${className}`);
          } else {
            let parent = el.parentNode;
            let siblings = Array.from(parent.children);
            let index = siblings.findIndex((sibling) => sibling === el) + 1;
            parts.unshift(`${label}:nth-child(${index})`);
          }
        }
      }
      return parts.join(" > ");
    });
  
    return cssSelector;
  }

module.exports = interactProfile;