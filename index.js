const { createCanvas, loadImage } = require('canvas');
const fs = require('fs');
const axios = require('axios');
const express = require('express');
const app = express();
const PORT = 5000;

const mode = process.argv[2];

const IMAGE_NAME = 'games.png';
const API_URL = 'https://vmix.hockeyettan.se/api/round/norra';
const UPDATE_INTERVAL = 10; // seconds

const modes = {
    local: async () => JSON.parse(fs.readFileSync('./local.json', 'utf8')),
    remote: async () => (await axios.get(API_URL)).data
}

if (!modes[mode]) {  
    console.error('Invalid mode specified. Please use "local" or "remote" as an argument.');
    process.exit(); 
}
console.log(`Score board is running in ${mode} mode`);

async function modify(data) {
    if (!data) { throw new Error("No data") }
    if (!Array.isArray(data)) { throw new Error("Data most be array") }
    if (data.length !== 1) { throw new Error("Data must be an array of one element") }
    const obj = data[0];

    const length = Object.keys(obj)
        .map(key => key.match(/^G(\d+)/))
        .filter(Boolean)
        .map(match => parseInt(match[1]))
        .reduce((max, cur) => Math.max(max, cur), 0);

    if (!length) { throw new Error("No Games") }

    return Array.from({ length }, (_, i) => `G${i}`)
        .map(gameKeyPrefix => ({
            text: obj[`${gameKeyPrefix}Result.Text`],
            homeTeam: {
                name: obj[`${gameKeyPrefix}HomeName.Text`],
                logo: obj[`${gameKeyPrefix}HomeLogo.Source`]
            },
            awayTeam: {
                name: obj[`${gameKeyPrefix}AwayName.Text`],
                logo: obj[`${gameKeyPrefix}AwayLogo.Source`]
            },
            background: obj[`${gameKeyPrefix}Background.Source`]
        })).filter(game => game.homeTeam.name && game.awayTeam.name);
}

async function createAllGamesImage(games) {
    if (!games || !games.length) { throw new Error("No game data is provided"); }

    // Each game's display size
    const gameWidth = 700;
    const gameHeight = 120;

    // Canvas size for vertical arrangement
    const canvasWidth = gameWidth;
    const canvasHeight = gameHeight * games.length;

    const canvas = createCanvas(canvasWidth, canvasHeight);
    const ctx = canvas.getContext('2d');

    for (let i = 0; i < games.length; i++) {
        const game = games[i];
        const yOffset = i * gameHeight; // Vertical offset for each game

        // Load and draw background
        const background = await loadImage(game.background);
        ctx.drawImage(background, 0, yOffset, gameWidth, 120);

        // Load and draw home team logo
        const homeLogo = await loadImage(game.homeTeam.logo);
        ctx.drawImage(homeLogo, 50, yOffset + 60, 150, 50);

        // Load and draw away team logo
        const awayLogo = await loadImage(game.awayTeam.logo);
        ctx.drawImage(awayLogo, 460, yOffset + 60, 150,50);

        // Draw score and text
        ctx.font = '25px Arial';
        ctx.fillStyle = 'white';
        ctx.fillText(game.homeTeam.name, 70, yOffset + 50);
        ctx.fillText(game.awayTeam.name, 480, yOffset + 50);
        ctx.font = '60px Arial';
        ctx.fillText(game.text, 250, yOffset + 100);
    }

    // Save to a file
    const buffer = canvas.toBuffer('image/png');
    fs.writeFileSync(IMAGE_NAME, buffer);

    console.log(`Board updated at ${new Date(Date.now()).toLocaleString()}`)
}

app.get('/', (_, res) => res.sendFile(__dirname + '/' + IMAGE_NAME));

app.listen(PORT, () => console.log(`Server listening at http://localhost:${PORT}`));

setInterval(() => {
    modes[mode]()
        .then(modify)
        .then(createAllGamesImage)
        .catch(error => console.log(error));
}, UPDATE_INTERVAL * 1000);
