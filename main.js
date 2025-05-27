const axios = require('axios');
const moment = require('moment-timezone');
const clc = require('cli-color');
const cron = require('node-cron');
require('dotenv').config();
const championsData = require('./data/champions.js');
const queueData = require('./data/queues.js');
const { PUUIDS } = require('./config.js');
const {
	sendDiscordMessage,
	sendLOLGameEndNotification,
	formatGameTime,
	formatStartTime,
	getCurrentTime,
	handleApiError,
} = require('./utils');

const RIOT_API_KEY = process.env.RIOT_API_KEY;
const LOL_WEBHOOK_URL = process.env.LOL_WEBHOOK_URL;
const LOG_WEBHOOK_URL = process.env.LOG_WEBHOOK_URL;

let activeMatches = {};
let hasError403 = false;

const getChampionInfo = (championId) => {
	return championsData.find((champion) => champion.id === championId);
};

const getQueueData = (queueId) => {
	return queueData.find((queue) => queue.queueId === queueId);
};

const setImgAndColorByMode = (gameMode) => {
	let img_url = '';
	let color = '';
	if (gameMode == 'ULTBOOK') {
		img_url =
			'https://support-leagueoflegends.riotgames.com/hc/article_attachments/7395520405011/ultimate-spellbook-icon.png';
		color = '65531';
	} else if (gameMode == 'CLASSIC' || gameMode == 'URF') {
		img_url =
			'https://static.wikia.nocookie.net/leagueoflegends/images/0/04/Summoner%27s_Rift_Minimap.png';
		color = '2883328';
	} else if (gameMode == 'ARAM') {
		img_url =
			'https://static.wikia.nocookie.net/leagueoflegends/images/0/07/Howling_Abyss_Minimap.png';
		color = '31743';
	} else if (gameMode == 'CHERRY') {
		img_url = 'https://blitz-cdn.blitz.gg//blitz/lol/arena/gladiator-medallion.webp';
		color = '16258839';
	}
	return { img_url: img_url, color: color };
};

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

		// get game data
		const response = await axios.get(
			`https://vn2.api.riotgames.com/lol/spectator/v5/active-games/by-summoner/${puuid}`,
			{
				headers: { 'X-Riot-Token': RIOT_API_KEY },
			}
		);

		if (response.status == 200) {
			const gameInfo = response.data;
			const gameId = gameInfo.gameId;

			// Xóa các trận đấu cũ của người chơi này
			for (let oldGameId in activeMatches) {
				const match = activeMatches[oldGameId];
				const playerToRemove = Array.from(match.players).find((p) => p.puuid === puuid);
				if (playerToRemove && !activeMatches[gameId]) {
					const riotIds = Array.from(match.players)
						.map((p) => p.riotId)
						.join('\n');

					await sendLOLGameEndNotification(LOL_WEBHOOK_URL, oldGameId, riotIds);
					delete activeMatches[oldGameId];
				}
			}

			// Khởi tạo thông tin trận đấu nếu chưa có
			if (!activeMatches[gameId]) {
				activeMatches[gameId] = {
					gameInfo: gameInfo,
					players: new Set(),
					notified: false,
				};
				activeMatches[gameId].players.add({
					puuid: puuid,
					riotId: riotId,
				});
			}

			console.log(clc.green(`${getCurrentTime()} --- ${riotId} in LOL game ${gameId}`));
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
			for (let gameId in activeMatches) {
				const match = activeMatches[gameId];
				const playerToRemove = Array.from(match.players).find((p) => p.puuid === puuid);
				if (playerToRemove) {
					const riotIds = Array.from(match.players)
						.map((p) => p.riotId)
						.join('\n');

					await sendLOLGameEndNotification(LOL_WEBHOOK_URL, gameId, riotIds);
					delete activeMatches[gameId];
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

			// get queue data
			const queueInfo = getQueueData(gameInfo.gameQueueConfigId);
			const queueMap = queueInfo.map;
			const queueType = queueInfo.description;
			// get list players
			const players = gameInfo.participants;

			let fields = [];
			if (gameInfo.gameMode === 'CHERRY') {
				// Xử lý cho chế độ CHERRY - 8 team, mỗi team 2 người
				// Chia thành 4 dòng, mỗi dòng 2 team
				for (let i = 0; i < 4; i++) {
					const team1Players = players.slice(i * 4, i * 4 + 2);
					const team2Players = players.slice(i * 4 + 2, i * 4 + 4);

					const team1Info = team1Players.reduce((string, p) => {
						const championInfo = getChampionInfo(p.championId);
						if (championInfo) {
							return string + '• ' + championInfo.name + ' - ' + p.riotId + '\n';
						}
						return string;
					}, '');

					const team2Info = team2Players.reduce((string, p) => {
						const championInfo = getChampionInfo(p.championId);
						if (championInfo) {
							return string + '• ' + championInfo.name + ' - ' + p.riotId + '\n';
						}
						return string;
					}, '');

					fields.push({
						name: `Team ${i * 2 + 1}:`,
						value: team1Info,
						inline: true,
					});
					fields.push({
						name: `Team ${i * 2 + 2}:`,
						value: team2Info,
						inline: true,
					});

					fields.push({
						name: '\u200b',
						value: '\u200b',
						inline: false,
					});
				}
			} else {
				// Xử lý cho các chế độ khác - 2 team
				const players_blue = players.slice(0, 5).reduce((string, p) => {
					const championInfo = getChampionInfo(p.championId);
					if (championInfo) {
						return string + '• ' + championInfo.name + ' - ' + p.riotId + '\n';
					}
					return string;
				}, '');
				const players_red = players.slice(5, players.length).reduce((string, p) => {
					const championInfo = getChampionInfo(p.championId);
					if (championInfo) {
						return string + '• ' + championInfo.name + ' - ' + p.riotId + '\n';
					}
					return string;
				}, '');
				fields = [
					{ name: 'Team 1:', value: players_blue, inline: true },
					{ name: 'Team 2:', value: players_red, inline: true },
				];
			}

			const gameLenFormatted = formatGameTime(gameInfo.gameLength);
			const startTime = formatStartTime(gameInfo.gameStartTime);

			const { img_url, color } = setImgAndColorByMode(gameInfo.gameMode);
			const timestamp = new Date().toISOString();
			const data = {
				content: null,
				embeds: [
					{
						title: `${watchedPlayers}`,
						description: `• GameID: ${gameInfo.gameId}\n• Mode: ${gameInfo.gameMode}\n• Type: ${queueType}\n• Map: ${queueMap}`,
						color: color,
						fields: fields,
						footer: {
							text: `${startTime} - Ingame: ${gameLenFormatted}`,
							icon_url: 'https://cdn-icons-png.flaticon.com/512/8327/8327677.png',
						},
						timestamp: timestamp,
						thumbnail: {
							url: img_url,
						},
					},
				],
				attachments: [],
			};
			await sendDiscordMessage(LOL_WEBHOOK_URL, data);
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
	console.log(`~~~~~~~~~~~ LOL Check: ${getCurrentTime()} ~~~~~~~~~~`);
	checkAllAccounts();
});
