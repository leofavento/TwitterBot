const axios = require('axios')
const token = require('./credentials.json').dolphintoken;
const fs = require('fs');
const { spawn } = require("child_process");

const delay = (ms) => new Promise((resolve) => {
    let min = ms * 0.9;
    let max = ms * 1.3;
    let waitingTime = Math.random() * (max - min) + min;
    setTimeout(resolve, waitingTime);
});

(async () => {
    let response = await axios.post('http://localhost:3001/v1.0/auth/login-with-token', 
    {
        'token': token
    }, {
        headers: {
            'Content-Type': 'application/json'
        }
    })
    .catch(error => {
        console.log(error);
        throw new Error(error)
    });

    let profiles = await axios.get('https://anty-api.com/browser_profiles?limit&page',
    {
        headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer ' +  token
        }
    });
    profiles = profiles.data.data;

    let accountsToRun = {}

    for (let i = 0; i < profiles.length; i++) {
        accountsToRun[profiles[i].name] = profiles[i].id;
    }

    let i = 0;
    for (let key in accountsToRun) {
        let numberOfSet = Math.floor(i / 5) + 1;
        let alphabetCategory = i % 5 + 1;

        if (!fs.existsSync(key)) {
            fs.cpSync('bot-sample', key, {recursive: true});
        }

        const childProcess = spawn('node', ['index', key, accountsToRun[key], alphabetCategory, numberOfSet]);

        childProcess.stdout.on('data', (data) => {
            console.log(`stdout: ${data}`);
        });

        childProcess.stderr.on('data', (data) => {
            console.error(`stderr: ${data}`);
        });

        childProcess.on('close', (code) => {
            console.log(`Child process exited with code ${code}`);
        });

        await delay(5000);

        i++;
    }
    
    /*
    response = await axios.get('http://localhost:3001/v1.0/browser_profiles/' + profileID + '/start?automation=1');

    let port = response.data.automation.port;
    let wsEndpoint = response.data.automation.wsEndpoint;
    */
})();