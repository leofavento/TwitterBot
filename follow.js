const delay = require('./utils.js');

async function followUsers(page, usersSet, timeBetween) {
    console.log("Following the selected users...");
    for (const url of usersSet) {
        try {
            await page.goto(`${url}`, {waitUntil: 'networkidle2'});
            await delay(2000);
            let name = url.split('/');
            name = name[name.length - 1]
            let followButton = await page.$('div[aria-label="Follow @' + name + '"]');
            if (followButton !== null) {
                await followButton.click();
            }
            await delay(2000);
            await page.goBack();
            await delay(3000);
        } catch (e) {
            console.log("Already following (" + url + ")");
            console.error(e);
        }
        await delay(timeBetween);
    }
    console.log("Finished to follow the selected users.")
}

async function followFromCsv(page, filename) {
    let users = new Set()
    console.log("Retrieving accounts to follow...")
    try {
        let csvContent = readFileSync(filename, { encoding: 'utf8', flag: 'r' });
        let arrayUsers = csvContent.split('\n');
        users = new Set(arrayUsers.filter(word => word.length > 0));
    } catch (e) {
        console.error(e);
    }
    await followUsers(page, users)
}

async function follow(page, pageUrl) {
    let followed = false;
    let name = pageUrl.split('/');
    name = name[name.length - 1]
    let followButton = await page.$('div[aria-label="Follow @' + name + '"]');
    if (followButton !== null) {
        console.log("Following @" + name + "...");
        followed = true;
        await followButton.click();
    }
    return followed
}

module.exports = {
    followUsers,
    followFromCsv,
    follow
}