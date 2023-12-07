const { createCanvas, loadImage } = require('canvas');
const fs = require('fs');
const axios = require('axios');
const API_URL = 'https://vmix.hockeyettan.se/api/round/norra';

async function fetchGameData() {
    const response = await axios.get(API_URL);
    return response.data;
}

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
    if (!games || !games.length) { throw new Error("No game data provided"); }

    // Each game's display size
    const gameWidth = 1000;
    const gameHeight = 600;

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
        ctx.drawImage(background, 0, yOffset, gameWidth, gameHeight);

        // Load and draw home team logo
        const homeLogo = await loadImage(game.homeTeam.logo);
        ctx.drawImage(homeLogo, 50, yOffset + 200, 200, 200);

        // Load and draw away team logo
        const awayLogo = await loadImage(game.awayTeam.logo);
        ctx.drawImage(awayLogo, 550, yOffset + 200, 200, 200);

        // Draw score and text
        ctx.font = '40px Arial';
        ctx.fillStyle = 'white';
        ctx.fillText(game.homeTeam.name, 50, yOffset + 150);
        ctx.fillText(game.awayTeam.name, 550, yOffset + 150);
        ctx.font = '60px Arial';
        ctx.fillText(game.text, 360, yOffset + 300);
    }

    // Save to a file
    const buffer = canvas.toBuffer('image/png');
    fs.writeFileSync('allGamesMatchVertical.png', buffer);
}

fetchGameData()
    .then(modify)
    .then(createAllGamesImage)
    .catch(error => console.log(error));