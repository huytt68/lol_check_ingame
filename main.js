const axios = require('axios');
const moment = require('moment-timezone');
const clc = require('cli-color');
const cron = require('node-cron');
require('dotenv').config();
const championsData = require('./data/champions.js');
const queueData = require('./data/queues.js');

const RIOT_API_KEY = process.env.RIOT_API_KEY;
const DISCORD_WEBHOOK_URL = process.env.DISCORD_WEBHOOK_URL;
const NOTI_WEBHOOK_URL = process.env.NOTI_WEBHOOK_URL;

// Thay thế PUUID đơn lẻ bằng mảng các PUUID
const PUUIDS = [
	'kDCBiPhDSjRRcynFvWvIDJ0DcDOibp96iVs0p_YHyQMuiXie2cRIpsZQSn5ugzXldIVJRIT3OoByBw', //Canh
	'A8EPhv7ChKwa3N12oTC2zZ6R-RFe0l3QSC4IaR09ccp6l7leiHuq7vM3cFEXui8zUICX6xC6NIAYvQ', //WX-78
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
let hasError403 = false;

const getChampionInfo = (championId) => {
	return championsData.find((champion) => champion.id === championId);
};

const getQueueData = (queueId) => {
	return queueData.find((queue) => queue.queueId === queueId);
};

const sendDiscordMessage = async (data) => {
	try {
		await axios.post(DISCORD_WEBHOOK_URL, data);
		// console.log('Đã gửi thông báo đến Discord:', data);
	} catch (error) {
		console.error('Lỗi khi gửi thông báo Discord:', error.message);
	}
};

const setImgAndColorByMode = (gameMode) => {
	let img_url = '';
	let color = '';
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
			const matchId = gameInfo.gameId;

			// Xóa các trận đấu cũ của người chơi này
			for (let oldMatchId in activeMatches) {
				const match = activeMatches[oldMatchId];
				const playerToRemove = Array.from(match.players).find((p) => p.puuid === puuid);
				if (playerToRemove && !activeMatches[matchId]) {
					// Tạo chuỗi riotId cho thông báo
					const riotIds = Array.from(match.players)
						.map((p) => p.riotId)
						.join('\n');

					// Gửi thông báo kết thúc trận đấu
					await sendGameEndNotification(oldMatchId, riotIds);

					// Xóa trận đấu cũ
					delete activeMatches[oldMatchId];
				}
			}

			// Khởi tạo thông tin trận đấu nếu chưa có
			if (!activeMatches[matchId]) {
				activeMatches[matchId] = {
					gameInfo: gameInfo,
					players: new Set(),
					notified: false, // flag để kiểm tra đã thông báo chưa
				};
				// Thêm người chơi vào trận đấu
				activeMatches[matchId].players.add({
					puuid: puuid,
					riotId: riotId,
				});
			}

			const now = moment().format('MMM d YYYY, HH:mm:ss');
			console.log(clc.green(`${now} --- ${riotId} in game ${matchId}`));
		}
	} catch (error) {
		// Xử lý khi không tìm thấy game active (404)
		if (error.response && error.response.status == 404) {
			// Xóa người chơi khỏi các trận đang theo dõi
			for (let matchId in activeMatches) {
				const match = activeMatches[matchId];
				const playerToRemove = Array.from(match.players).find((p) => p.puuid === puuid);
				if (playerToRemove) {
					// Tạo chuỗi riotId cho thông báo
					const riotIds = Array.from(match.players)
						.map((p) => p.riotId)
						.join('\n');

					// Gửi thông báo kết thúc trận đấu
					await sendGameEndNotification(matchId, riotIds);

					// Xóa trận đấu cũ
					delete activeMatches[matchId];
				}
			}
		} else if (error.response && error.response.status == 403) {
			if (!hasError403) {
				hasError403 = true;
				const warningMessage = {
					content:
						'⚠️ **CẢNH BÁO**: Riot API key đã hết hạn!\nVui lòng tạo key mới tại: https://developer.riotgames.com/',
				};
				await axios.post(NOTI_WEBHOOK_URL, warningMessage);

				// log
				const now = moment().format('MMM d YYYY, HH:mm:ss');
				console.error(clc.red(`${now} --- API key đã hết hạn!`));

				// Dừng chương trình
				process.exit(1);
			}
			return;
		} else {
			const now = moment().format('MMM d YYYY, HH:mm:ss');
			console.error(clc.red(`${now} --- Error for ${riotId}:`, error.message));
		}
	}
};

// Hàm mới để gửi thông báo game kết thúc
const sendGameEndNotification = async (matchId, riotId) => {
	const timestamp = new Date().toISOString();
	await sendDiscordMessage({
		embeds: [
			{
				title: `${riotId}`,
				description: `GameID: ${matchId}`,
				color: 6381921,
				fields: [
					{
						name: '<:aukey:847123822003879956> Game has ended!:',
						value: '',
						inline: false,
					},
				],
				timestamp: timestamp,
			},
		],
	});
};

const sendNewGameNotifications = async () => {
	for (let matchId in activeMatches) {
		const match = activeMatches[matchId];

		// Chỉ gửi thông báo cho các trận chưa được thông báo
		if (!match.notified) {
			const gameInfo = match.gameInfo;
			const track_players = Array.from(match.players);

			// Tạo danh sách người chơi đang theo dõi
			const watchedPlayers = track_players.map((p) => p.riotId).join('\n');

			// get queue data
			const queueInfo = getQueueData(gameInfo.gameQueueConfigId);
			const queueMap = queueInfo.map;
			const queueType = queueInfo.description;
			// get list players
			const players = gameInfo.participants;
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

			const gameLenMinutes = Math.floor(gameInfo.gameLength / 60);
			const gameLenSeconds = gameInfo.gameLength % 60;
			const gameLenFormatted = `${gameLenMinutes.toString().padStart(2, '0')}:${gameLenSeconds
				.toString()
				.padStart(2, '0')}`;
			const startTime = moment(gameInfo.gameStartTime)
				.tz('Asia/Ho_Chi_Minh')
				.locale('vi')
				.format('YYYY-MM-DD HH:mm:ss');

			const { img_url, color } = setImgAndColorByMode(gameInfo.gameMode);
			const timestamp = new Date().toISOString();
			const data = {
				embeds: [
					{
						title: `${watchedPlayers}`,
						description: `• GameID: ${gameInfo.gameId}\n• Mode: ${gameInfo.gameMode}\n• Type: ${queueType}\n• Map: ${queueMap}`,
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

			await sendDiscordMessage(data);
			match.notified = true;
		}
	}
};

// Check all
const checkAllAccounts = async () => {
	// Kiểm tra tất cả tài khoản
	for (const puuid of PUUIDS) {
		await checkActiveGame(puuid);
	}

	// Sau khi kiểm tra xong tất cả, gửi thông báo cho các trận mới
	await sendNewGameNotifications();
};

//  Lập lịch kiểm tra mỗi 2 phút
cron.schedule('*/2 * * * *', () => {
	const now = moment().format('MMM d YYYY, HH:mm:ss');
	console.log(`~~~~~~~~~~~ ${now} ~~~~~~~~~~`);
	checkAllAccounts();
});
