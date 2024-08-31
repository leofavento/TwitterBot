const writeFileSync = require('fs').writeFileSync;
const readFileSync = require('fs').readFileSync;
const delay = require('./utils.js');

async function unfollowUsers(page, numberOfUnfollows) {
    await page.waitForSelector('[aria-label="Profile"]');
    await page.click('a[aria-label="Profile"]');
    await delay(3000);

    await page.waitForSelector('.r-1mf7evn > a:nth-child(1)');
    let textFollowing = await page.$('.r-1mf7evn > a:nth-child(1)');
    textFollowing = await textFollowing.$('span[class="css-901oao css-16my406 r-poiln3 r-bcqeeo r-qvutc0"]')
    const numOfFollowing = await (await textFollowing.getProperty('textContent')).jsonValue()

    await textFollowing.click();
    await delay(2000);

    // scroll to bottom of the page
    try {
        let previousHeight;
        let newHeight;
        while (true) {
            previousHeight = await page.evaluate('document.body.scrollHeight');
            await page.evaluate(() => {
                window.scrollBy(0, 3 * document.body.clientHeight);
            });
            await delay(2500);
            newHeight = await page.evaluate('document.body.scrollHeight');
            if (newHeight === previousHeight) {
                break;
            }
        }
        await delay(1500);
    } catch(e) { 
        console.log(e);
    }

    let currentFollowers = new Set()
    try {
        let csvContent = readFileSync('./followers.csv', { encoding: 'utf8', flag: 'r' });
        let arrayFollowers = csvContent.split('\n');
        currentFollowers = new Set(arrayFollowers.filter(word => word.length > 0))
    } catch {
    }
    
    let unfollowed = 0;
    let looked = new Set()
    try {
        while (unfollowed < numberOfUnfollows) {
            const followingArea = await page.$('div[aria-label="Timeline: Following"]');

            const usersFollowed = await followingArea.$x('//div[@data-testid="UserCell"]');

            for (let i = usersFollowed.length - 1; i >= 2; i--) {
                const userUrl = await usersFollowed[i].$('a[class="css-4rbku5 css-18t94o4 css-1dbjc4n r-1niwhzg r-1loqt21 r-1pi2tsx r-1ny4l3l r-o7ynqc r-6416eg r-13qz1uu"]');

                let urlHref = await userUrl.getProperty('href');
                urlHref = await urlHref.jsonValue();

                if (looked.has(urlHref)) {
                    continue;
                } else {
                    looked.add(urlHref);
                    try {
                        await usersFollowed[i-2].scrollIntoView({ behavior: 'smooth', block: 'end', inline: 'end' });
                        await usersFollowed[i-1].scrollIntoView({ behavior: 'smooth', block: 'end', inline: 'end' });
                        await delay(1000);
                    } catch (e) {
                        break;
                    }
                }

                if (currentFollowers.has(urlHref)) {
                    continue;
                }

                let unfollowButton = await usersFollowed[i].$('div[role="button"]');

                let textButton = await (await unfollowButton.getProperty('textContent')).jsonValue();

                if ((textButton === "Following" || textButton === "Unfollow") && unfollowButton !== null) {
                    await unfollowButton.click();
                    await delay(1000);

                    const dialog = await page.$('div[data-testid="confirmationSheetDialog"]');
                    let confirmButton = await dialog.$('div[data-testid="confirmationSheetConfirm"]');
                    await confirmButton.click();

                    console.log("Unfollowed " + urlHref);
                    unfollowed++;
                    await delay(1000);
                }

                if (unfollowed >= numberOfUnfollows) {
                    break;
                }
            }
        }
    } catch(e) { 
        console.log(e);
    }
    await page.goBack();
    await delay(3000);
    await page.goBack();
    await delay(5000);

    return unfollowed;
}

module.exports = unfollowUsers;