const axios = require('axios');

let profileID = 0

async function connect(dolphinProfileID) {
    profileID = dolphinProfileID;

    let response = await axios.get('http://localhost:3001/v1.0/browser_profiles/' + profileID + '/start?automation=1');

    let port = response.data.automation.port;
    let wsEndpoint = response.data.automation.wsEndpoint;
    return { port, wsEndpoint };
}

async function stop() {
    response = await axios.get('http://localhost:3001/v1.0/browser_profiles/' + profileID + '/stop');
}

module.exports = {
    connect,
    stop
}

/*
const axios = require('axios');
let data = '';

let config = { method: 'get', maxBodyLength: Infinity, url: 'https://anty-api.com/browser_profiles?page&limit', headers: { 'Authorization': 'Bearer TOKEN', 'Content-Type': 'application/json' }, data : data};
axios.request(config).then((response) => { console.log(JSON.stringify(response.data));}).catch((error) => { console.log(error);});
*/