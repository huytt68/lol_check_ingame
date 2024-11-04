const axios = require('axios');
const moment = require('moment');
const clc = require('cli-color');
const cron = require('node-cron');

require('dotenv').config();

const RIOT_API_KEY = process.env.RIOT_API_KEY;
const DISCORD_WEBHOOK_URL = process.env.DISCORD_WEBHOOK_URL;

// Thay thế PUUID đơn lẻ bằng mảng các PUUID
const PUUIDS = [
	'kDCBiPhDSjRRcynFvWvIDJ0DcDOibp96iVs0p_YHyQMuiXie2cRIpsZQSn5ugzXldIVJRIT3OoByBw', //Canh
	'A8EPhv7ChKwa3N12oTC2zZ6R-RFe0l3QSC4IaR09ccp6l7leiHuq7vM3cFEXui8zUICX6xC6NIAYvQ', //Acc 2
	'5_rMZmg-6iXhmXyt6KDkvlG3fLFBi_cXQzrT6wjTINsDOXttKjGFTLqZ1MCis4Y9hKLeSHTip7BhVQ', //Thanh
	'g0TrnM_G4cv05AAuUcbZv_Aq5sJVTMD9zqm5rE-qb1gT1V7j9FVGBm9O5mwUCu6pFypoGDPjcqBO2g', //cng
	'Mf2G9VDyxPNzMWXIFG3XUrZokeb9DnmUJbjU4DaguBwHGQPzfw8UM88ag5XYp2RQ5QCphqFpUINpEg', //Tung
	'tFWexGScpheDQ0FynXm4DzqwfLxOArQeea8x_aAk-1DTryI8iHLnhlm_mY4McvI1SpLax95UqQz0pQ', //Buom
	'gMh-RKvgTnZ40G9PfbA1QZ56cuQvUoAv-JkGGIaX32FJSWqABWELrQK5ZS4Xta2PTlIll7jSGT3s5Q', //Duke
	'Zfl6WezAOAyt0BEjAD2ThV25eJr1MIGHkG2OHfj7fPuxvoEzTyZna2FaPSBct-YKEAY6fV4G8vYL_w', //Vinh
	'SEmrr51edIxdP0jKYh06wSG5oT1tTBs8Gu-YRWvLVVBDNANEd4Hn5OE_Q4wnqpvdkJZkAYuiCDF6Gw', //Long
	'-W501c8FUJByT6vwR4NcUBm0SdEVMMqLo84pS7Vqb-Ydh3y4gucm7FvD4ZLaRX2mozEi3Ra7R4pOUg', //Manh
	'vlJzxNCdhjYDvadtKmAXh-O9-4N5IE-KP6ItgkPkHAffnGb6NP17loR-b5VJHgjejtqlZCArJC_PpQ', //cutu
];
let activeMatches = {};

async function sendDiscordMessage(data) {
	try {
		await axios.post(DISCORD_WEBHOOK_URL, data);
		// console.log('Đã gửi thông báo đến Discord:', data);
	} catch (error) {
		console.error('Lỗi khi gửi thông báo Discord:', error.message);
	}
}

const setImgAndColorByMode = (gameMode) => {
	if (gameMode == 'ULTBOOK') {
		img_url =
			'https://support-leagueoflegends.riotgames.com/hc/article_attachments/7395520405011/ultimate-spellbook-icon.png';
		color = '65531';
	} else if (gameMode == 'CLASSIC') {
		img_url =
			'https://static.wikia.nocookie.net/leagueoflegends/images/0/04/Summoner%27s_Rift_Minimap.png';
		color = '2883328';
	} else if (gameMode == 'ARAM') {
		img_url =
			'https://static.wikia.nocookie.net/leagueoflegends/images/0/07/Howling_Abyss_Minimap.png';
		color = '31743';
	}

	return { img_url: img_url, color: color };
};

// Sử dụng webhook riêng cho từng account
async function checkActiveGame(puuid) {
	try {
		const user_response = await axios.get(
			`https://asia.api.riotgames.com/riot/account/v1/accounts/by-puuid/${puuid}`,
			{
				headers: { 'X-Riot-Token': RIOT_API_KEY },
			}
		);
		const userInfo = user_response.data;
		const riotId = `${userInfo.gameName}#${userInfo.tagLine}`;
		const response = await axios.get(
			`https://vn2.api.riotgames.com/lol/spectator/v5/active-games/by-summoner/${puuid}`,
			{
				headers: { 'X-Riot-Token': RIOT_API_KEY },
			}
		);
		// Nếu có trận đấu, gửi thông báo đến Discord
		const timestamp = new Date().toISOString();
		if (response.status == 200) {
			const gameInfo = response.data;

			// get list players
			const players = gameInfo.participants;
			const players_blue = players.slice(0, 5).reduce((string, p) => string + p.riotId + '\n', '');
			const players_red = players
				.slice(5, players.length)
				.reduce((string, p) => string + p.riotId + '\n', '');

			const gameLenMinutes = Math.floor(gameInfo.gameLength / 60);
			const gameLenSeconds = gameInfo.gameLength % 60;
			const gameLenFormatted = `${gameLenMinutes.toString().padStart(2, '0')}:${gameLenSeconds
				.toString()
				.padStart(2, '0')}`;
			const startTime = moment(gameInfo.gameStartTime).format('YYYY-MM-DD HH:mm:ss');

			const { img_url, color } = setImgAndColorByMode(gameInfo.gameMode);
			const data = {
				embeds: [
					{
						title: `${riotId}`,
						description: `Mode: ${gameInfo.gameMode}\nGameID: ${gameInfo.gameId}`,
						color: color,
						footer: {
							text: `${startTime} - Ingame: ${gameLenFormatted}`,
							icon_url: 'https://cdn-icons-png.flaticon.com/512/8327/8327677.png',
						},
						author: {
							name: '',
						},
						fields: [
							{ name: 'Team 1:', value: players_blue, inline: true },
							{ name: 'Team 2:', value: players_red, inline: true },
						],
						timestamp: timestamp,
						thumbnail: {
							url: img_url,
						},
					},
				],
				content: '',
			};

			// match id
			const matchId = gameInfo.gameId;
			if (matchId) {
				// if new match
				if (!activeMatches[matchId]) {
					activeMatches[matchId] = new Set();
					await sendDiscordMessage(data);
				}
				// add player to match
				activeMatches[matchId].add(puuid);
			}

			// Log
			const now = moment().format('MMM d YYYY, HH:mm:ss');
			console.log(clc.green(`${now} --- ${riotId} in game`));
		}
	} catch (error) {
		const user_response = await axios.get(
			`https://asia.api.riotgames.com/riot/account/v1/accounts/by-puuid/${puuid}`,
			{
				headers: { 'X-Riot-Token': RIOT_API_KEY },
			}
		);
		const userInfo = user_response.data;
		const riotId = `${userInfo.gameName}#${userInfo.tagLine}`;
		if (error.response && error.response.status == 404) {
			for (let matchId in activeMatches) {
				if (activeMatches[matchId].has(puuid)) {
					activeMatches[matchId].delete(puuid);
					// Nếu không còn ai trong trận, xóa luôn matchId khỏi activeMatches
					if (activeMatches[matchId].size === 0) {
						await sendDiscordMessage({ content: `Trận đấu #${matchId} đã kết thúc!` });
						delete activeMatches[matchId];
					}
				}
			}
		} else {
			console.error(clc.red(`${now} --- Error for ${riotId}:`, error.message));
		}
	}
}

// Check all
const checkAllAccounts = () => {
	PUUIDS.forEach((puuid, index) => {
		setTimeout(async () => {
			await checkActiveGame(puuid);
		}, index * 1000);
	});
};

//  Lập lịch kiểm tra mỗi 5 phút
cron.schedule('*/1 * * * *', () => {
	const now = moment().format('MMM d YYYY, HH:mm:ss');
	console.log(`~~~~~~~~~~~ ${now} ~~~~~~~~~~`);
	checkAllAccounts();
});
