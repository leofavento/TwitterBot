# Twitter Bot

This Twitter Bot automates simple actions like following users and basic interactions using Puppeteer.

## Setup

1. Clone the repository and navigate to the project directory.

2. Ensure you have Node.js installed. You can download it from [here](https://nodejs.org/).

3. Install the required dependencies by running:

   ```bash
   npm install

The following dependencies are specified in the `package.json`:

- `axios`: ^1.4.0
- `ghost-cursor`: ^1.1.19
- `puppeteer`: ^20.8.0
- `puppeteer-extra`: ^3.3.6
- `puppeteer-extra-plugin-stealth`: ^2.11.2

4. Create a `credential.json` file in the root directory with the following structure:
```
{
    "twitter": [
      { "username": <Twitter username/email>, "password": <Twitter password> }
    ],
    "dolphinanty" : [
      { "token":  <Dolphin Anty API Token> }
    ]
  }
```

Replace the placeholders with your actual credentials.

## Usage

To run the bot, use the following command:

```
node index <Dolphin Profile Name> <Alphabet Category>
```

### Parameters:

- **Dolphin Profile Name**: The name of the profile configured in Dolphin Anty.
- **Alphabet Category**: A number between 1 and 5, representing different groups of letters and digits to filter usernames by their starting character:
  - `1` to `5`: Each number corresponds to a specific group of letters and digits.
  - `0`: No restriction on the initial letter (follow users with any starting letter).

## Dependencies

This bot uses the following packages:

- **axios**: For making HTTP requests.
- **ghost-cursor**: To simulate realistic mouse movements.
- **puppeteer**: A headless browser for automation tasks.
- **puppeteer-extra**: An extended version of Puppeteer with additional plugins.
- **puppeteer-extra-plugin-stealth**: A plugin to avoid detection while using Puppeteer.

These dependencies are automatically installed when you run `npm install`.

## Important Note

This project is somewhat outdated and might not be fully functional anymore. Twitter's web interface frequently change, and this bot may no longer work as expected. You may need to update some parts of the code or dependencies to make it work with the current version of Twitter.

## Notes

- Handle your credentials with care and avoid sharing your `credential.json` file publicly.
- This bot is designed for simple automation tasks. Ensure that your usage complies with Twitter's automation policies.
