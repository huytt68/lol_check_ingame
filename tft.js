const axios = require('axios');
const moment = require('moment-timezone');
const clc = require('cli-color');
const cron = require('node-cron');
require('dotenv').config();
const { PUUIDS } = require('./config.js');
const {
	sendDiscordMessage,
	sendGameEndNotification,
	formatGameTime,
	formatStartTime,
	getCurrentTime,
	handleApiError,
} = require('./utils');

const RIOT_API_KEY = process.env.RIOT_API_KEY;
const TFT_WEBHOOK_URL = process.env.TFT_WEBHOOK_URL;
const LOG_WEBHOOK_URL = process.env.LOG_WEBHOOK_URL;

let activeMatches = {};
let hasError403 = false;

const checkActiveGame = async (puuid) => {
	try {
		// get riotId
		const user_response = await axios.get(
			`https://asia.api.riotgames.com/riot/account/v1/accounts/by-puuid/${puuid}`,
			{
				headers: { 'X-Riot-Token': RIOT_API_KEY },
			}
		);
		const userInfo = user_response.data;
		const riotId = `${userInfo.gameName}#${userInfo.tagLine}`;

		// get TFT game data
		const response = await axios.get(
			`https://vn2.api.riotgames.com/lol/spectator/tft/v5/active-games/by-puuid/${puuid}`,
			{
				headers: { 'X-Riot-Token': RIOT_API_KEY },
			}
		);

		if (response.status == 200) {
			const gameInfo = response.data;
			const matchId = gameInfo.gameId;

			// Xóa các trận đấu cũ của người chơi này
			for (let oldMatchId in activeMatches) {
				const match = activeMatches[oldMatchId];
				const playerToRemove = Array.from(match.players).find((p) => p.puuid === puuid);
				if (playerToRemove && !activeMatches[matchId]) {
					const riotIds = Array.from(match.players)
						.map((p) => p.riotId)
						.join('\n');

					await sendGameEndNotification(TFT_WEBHOOK_URL, oldMatchId, riotIds);
					delete activeMatches[oldMatchId];
				}
			}

			// Khởi tạo thông tin trận đấu nếu chưa có
			if (!activeMatches[matchId]) {
				activeMatches[matchId] = {
					gameInfo: gameInfo,
					players: new Set(),
					notified: false,
				};
				activeMatches[matchId].players.add({
					puuid: puuid,
					riotId: riotId,
				});
			}

			console.log(clc.yellow(`${getCurrentTime()} --- ${riotId} in TFT game ${matchId}`));
		}
	} catch (error) {
		const { shouldContinue, hasError403: newHasError403 } = await handleApiError(
			error,
			puuid,
			LOG_WEBHOOK_URL,
			hasError403
		);
		hasError403 = newHasError403;

		if (shouldContinue) {
			// Xóa người chơi khỏi các trận đang theo dõi
			for (let matchId in activeMatches) {
				const match = activeMatches[matchId];
				const playerToRemove = Array.from(match.players).find((p) => p.puuid === puuid);
				if (playerToRemove) {
					const riotIds = Array.from(match.players)
						.map((p) => p.riotId)
						.join('\n');

					await sendGameEndNotification(TFT_WEBHOOK_URL, matchId, riotIds);
					delete activeMatches[matchId];
				}
			}
		}
	}
};

const sendNewGameNotifications = async () => {
	for (let matchId in activeMatches) {
		const match = activeMatches[matchId];

		if (!match.notified) {
			const gameInfo = match.gameInfo;
			const track_players = Array.from(match.players);
			const watchedPlayers = track_players.map((p) => p.riotId).join('\n');

			const gameLenFormatted = formatGameTime(gameInfo.gameLength);
			const startTime = formatStartTime(gameInfo.gameStartTime);

			const timestamp = new Date().toISOString();
			const data = {
				content: null,
				embeds: [
					{
						title: `${watchedPlayers}`,
						description: `• GameID: ${gameInfo.gameId}\n• Game Type: ${gameInfo.gameType}\n• Game Mode: ${gameInfo.gameMode}`,
						color: 16776960, // Màu vàng cho TFT
						fields: [
							{
								name: 'Game Status',
								value: `Started at: ${startTime}\nDuration: ${gameLenFormatted}`,
								inline: false,
							},
						],
						footer: {
							text: `${startTime} - Ingame: ${gameLenFormatted}`,
							icon_url: 'https://cdn-icons-png.flaticon.com/512/8327/8327677.png',
						},
						timestamp: timestamp,
						thumbnail: {
							url: 'https://cdna.artstation.com/p/assets/images/images/025/410/380/large/t-j-geisen-tft-iconv2-v005-crop-arstation.jpg',
						},
					},
				],
				attachments: [],
			};
			await sendDiscordMessage(TFT_WEBHOOK_URL, data);
			match.notified = true;
		}
	}
};

const checkAllAccounts = async () => {
	for (const puuid of PUUIDS) {
		await checkActiveGame(puuid);
	}
	await sendNewGameNotifications();
};

// Lập lịch kiểm tra mỗi 2 phút
cron.schedule('*/2 * * * *', () => {
	console.log(`~~~~~~~~~~~ TFT Check: ${getCurrentTime()} ~~~~~~~~~~`);
	checkAllAccounts();
});
