const writeFileSync = require('fs').writeFileSync;
const readFileSync = require('fs').readFileSync;
const delay = require('./utils.js');

// scrape accounts followed and save them into following.csv
async function updateFollowings(page) {
    await page.waitForSelector('[aria-label="Profile"]');
    await page.click('a[aria-label="Profile"]');
    await delay(3000);

    await page.waitForSelector('.r-1mf7evn > a:nth-child(1)');
    let textFollowing = await page.$('.r-1mf7evn > a:nth-child(1)');
    textFollowing = await textFollowing.$('span[class="css-901oao css-16my406 r-poiln3 r-bcqeeo r-qvutc0"]')
    const numOfFollowing = await (await textFollowing.getProperty('textContent')).jsonValue()

    await textFollowing.click();
    await delay(2000);

    console.log("Getting current accounts followed...");
    let following = new Set()
    try {
        let previousHeight;
        while (following.size < Number(numOfFollowing)) {
            const followingArea = await page.$('div[aria-label="Timeline: Following"]');

            const elementHandles = await followingArea.$x('//*[@class="css-4rbku5 css-18t94o4 css-1dbjc4n r-1niwhzg r-1loqt21 r-1pi2tsx r-1ny4l3l r-o7ynqc r-6416eg r-13qz1uu"]');
            
            const propertyJsHandles = await Promise.all(
                elementHandles.map(handle => handle.getProperty('href'))
            );
            const urls = await Promise.all(
                propertyJsHandles.map(handle => handle.jsonValue())
            );

            urls.forEach(item => following.add(item))

            await elementHandles[elementHandles.length - 1].scrollIntoView({ behavior: 'smooth', block: 'end', inline: 'end' });
            
            /*
            if (following.size < Number(numOfFollowing)) {
                previousHeight = await page.evaluate('document.body.scrollHeight');
                //await page.evaluate('window.scrollTo(0, document.body.scrollHeight)');
                await page.evaluate(() => {
                    window.scrollBy(0, 3 * document.body.clientHeight);
                });
                await page.waitForFunction(`document.body.scrollHeight > ${previousHeight}`, {timeout: 10000});
            }
            */
            await delay(2000);
        }
    } catch(e) { 
        console.error("Could not find " + numOfFollowing + " accounts followed")
    }
    await page.goBack();
    await delay(3000);
    await page.goBack();
    await delay(5000);

    let csvContent = ''
    following.forEach(el => {
        csvContent += el + '\n'
    })
    console.log("Saving scraped followings...")
    try {
        writeFileSync('./following.csv', csvContent);
    } catch (e) {
        console.error(e);
    }
}

// retrieve content from following.csv
async function downloadFollowings() {
    let following = new Set()
    console.log("Retrieving followings...")
    try {
        let csvContent = readFileSync('./following.csv', { encoding: 'utf8', flag: 'r' });
        let arrayFollowing = csvContent.split('\n');
        following = new Set(arrayFollowing.filter(word => word.length > 0))
        return following;
    } catch {
        return following;
    }
}

module.exports = {
    updateFollowings, 
    downloadFollowings
}