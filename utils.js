const axios = require('axios');
const moment = require('moment-timezone');
const clc = require('cli-color');
const { PUUIDS } = require('./config.js');
const championsData = require('./data/champions.js');
require('dotenv').config();

const RIOT_API_KEY = process.env.RIOT_API_KEY;

const sendDiscordMessage = async (webhookUrl, data) => {
	try {
		await axios.post(webhookUrl, data);
	} catch (error) {
		console.error('Lỗi khi gửi thông báo Discord:', error.message);
	}
};

const getCurrentTime = () => {
	return moment().tz('Asia/Ho_Chi_Minh').format('MMM D YYYY, HH:mm:ss');
};

const handleApiError = async (error, puuid, NOTI_WEBHOOK_URL, hasError403) => {
	if (error.response && error.response.status == 404) {
		return { shouldContinue: true, hasError403 };
	} else if (error.response && error.response.status == 403) {
		if (!hasError403) {
			const warningMessage = {
				content:
					'⚠️ **CẢNH BÁO**: Riot API key đã hết hạn!\nVui lòng tạo key mới tại: https://developer.riotgames.com/',
			};
			await axios.post(NOTI_WEBHOOK_URL, warningMessage);
			console.error(clc.red(`${getCurrentTime()} --- API key đã hết hạn!`));
			process.exit(1);
		}
		return { shouldContinue: false, hasError403: true };
	} else if (error.response && error.response.status == 400) {
		console.error(
			clc.red(`${getCurrentTime()} --- Lỗi 400 Bad Request khi kiểm tra PUUID: ${puuid}`)
		);
		console.error(
			clc.yellow(
				`Chi tiết lỗi: ${error.response.data ? JSON.stringify(error.response.data) : error.message}`
			)
		);
		return { shouldContinue: false, hasError403 };
	} else {
		console.error(clc.red(`${getCurrentTime()} --- Error:`, error.message));
		if (error.response) {
			console.error(
				clc.yellow(
					`Status: ${error.response.status}, Data: ${JSON.stringify(error.response.data || {})}`
				)
			);
		}
		return { shouldContinue: false, hasError403 };
	}
};

const getMatchResult = async (gameId) => {
	console.log(clc.blue(`${getCurrentTime()} --- Đang lấy kết quả trận đấu LOL: ${gameId}`));
	try {
		// Tạo matchId từ gameId
		const matchId = `VN2_${gameId}`;
		console.log(clc.blue(`${getCurrentTime()} --- MatchId được tạo: ${matchId}`));

		// Lấy thông tin trận đấu từ MATCH-V5 API
		const response = await axios.get(
			`https://sea.api.riotgames.com/lol/match/v5/matches/${matchId}`,
			{
				headers: {
					'X-Riot-Token': RIOT_API_KEY,
				},
			}
		);

		const matchData = response.data;
		console.log(clc.green(`${getCurrentTime()} --- Đã lấy được thông tin trận đấu LOL`));

		// Tìm thông tin người chơi trong trận đấu
		const participant = matchData.info.participants.find((p) => PUUIDS.includes(p.puuid));
		if (!participant) {
			console.log(
				clc.yellow(`${getCurrentTime()} --- Không tìm thấy thông tin người chơi trong trận đấu`)
			);
			return null;
		}

		return {
			win: participant.win,
			championId: participant.championId,
			kills: participant.kills,
			deaths: participant.deaths,
			assists: participant.assists,
			gameDuration: matchData.info.gameDuration,
		};
	} catch (error) {
		console.log(
			clc.red(`${getCurrentTime()} --- Lỗi khi lấy kết quả trận đấu LOL: ${error.message}`)
		);
		if (error.response) {
			console.log(clc.yellow(`${getCurrentTime()} --- Status: ${error.response.status}`));
			console.log(
				clc.yellow(`${getCurrentTime()} --- Data: ${JSON.stringify(error.response.data || {})}`)
			);
		}
		return null;
	}
};

const getTFTMatchResult = async (gameId) => {
	console.log(clc.blue(`${getCurrentTime()} --- Đang lấy kết quả trận đấu TFT: ${gameId}`));
	try {
		// Tạo matchId từ gameId
		const matchId = `VN2_${gameId}`;
		console.log(clc.blue(`${getCurrentTime()} --- MatchId được tạo: ${matchId}`));

		// Lấy thông tin trận đấu từ TFT-MATCH-V1 API
		const response = await axios.get(
			`https://sea.api.riotgames.com/tft/match/v1/matches/${matchId}`,
			{
				headers: {
					'X-Riot-Token': RIOT_API_KEY,
				},
			}
		);

		const matchData = response.data;
		console.log(clc.green(`${getCurrentTime()} --- Đã lấy được thông tin trận đấu TFT`));

		// Tìm thông tin người chơi trong trận đấu
		const participant = matchData.info.participants.find((p) => PUUIDS.includes(p.puuid));
		if (!participant) {
			console.log(
				clc.yellow(`${getCurrentTime()} --- Không tìm thấy thông tin người chơi trong trận đấu`)
			);
			return null;
		}

		return {
			placement: participant.placement,
		};
	} catch (error) {
		console.log(
			clc.red(`${getCurrentTime()} --- Lỗi khi lấy kết quả trận đấu TFT: ${error.message}`)
		);
		return null;
	}
};

const sendLOLGameEndNotification = async (webhookUrl, gameId, riotId) => {
	console.log(
		clc.blue(
			`${getCurrentTime()} --- Đang gửi thông báo kết thúc game LOL: ${gameId} cho ${riotId}`
		)
	);
	const timestamp = new Date().toISOString();

	// Lấy thông tin kết quả trận đấu
	const matchResult = await getMatchResult(gameId);
	if (!matchResult) {
		console.log(clc.yellow(`${getCurrentTime()} --- Không lấy được kết quả trận đấu`));
		return;
	}

	// Lấy thông tin tướng
	const championInfo = championsData.find((c) => c.id === matchResult.championId);
	const championName = championInfo ? championInfo.name : 'Unknown';

	// Tính toán KDA
	const kda = `${matchResult.kills}/${matchResult.deaths}/${matchResult.assists}`;
	const kdaRatio =
		matchResult.deaths === 0
			? (matchResult.kills + matchResult.assists).toFixed(2)
			: ((matchResult.kills + matchResult.assists) / matchResult.deaths).toFixed(2);

	// Tính thời gian trận đấu (mm:ss)
	const gameLength = matchResult.gameDuration || 0;
	const minutes = Math.floor(gameLength / 60);
	const seconds = gameLength % 60;
	const gameTime = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;

	// Tạo thông báo
	const data = {
		embeds: [
			{
				title: `${riotId}`,
				description: `GameID: ${gameId}`,
				color: matchResult.win ? 65280 : 16711680, // Xanh lá nếu thắng, đỏ nếu thua
				fields: [
					{
						name: matchResult.win ? '🏆 Thắng' : '💀 Thua',
						value: `${championName}\n${kda} (${kdaRatio})\n${gameTime}`,
						inline: false,
					},
				],
				timestamp: timestamp,
			},
		],
	};

	console.log(clc.green(`${getCurrentTime()} --- Đang gửi thông báo Discord cho LOL`));
	await sendDiscordMessage(webhookUrl, data);
	console.log(clc.green(`${getCurrentTime()} --- Đã gửi thông báo Discord cho LOL`));
};

const sendTFTGameEndNotification = async (webhookUrl, gameId, riotId) => {
	console.log(
		clc.blue(
			`${getCurrentTime()} --- Đang gửi thông báo kết thúc game TFT: ${gameId} cho ${riotId}`
		)
	);
	const timestamp = new Date().toISOString();

	// Lấy thông tin kết quả trận đấu
	const matchResult = await getTFTMatchResult(gameId);
	if (!matchResult) {
		console.log(clc.yellow(`${getCurrentTime()} --- Không lấy được kết quả trận TFT`));
		return;
	}

	// Tạo thông báo
	const data = {
		embeds: [
			{
				title: `${riotId}`,
				description: `GameID: ${gameId}`,
				color: matchResult.placement <= 4 ? 65280 : 16711680, // Xanh lá nếu top 4, đỏ nếu không
				fields: [
					{
						name: 'Kết quả',
						value: `Hạng ${matchResult.placement}`,
						inline: false,
					},
				],
				timestamp: timestamp,
			},
		],
	};

	console.log(clc.green(`${getCurrentTime()} --- Đang gửi thông báo Discord cho TFT`));
	await sendDiscordMessage(webhookUrl, data);
	console.log(clc.green(`${getCurrentTime()} --- Đã gửi thông báo Discord cho TFT`));
};

const formatGameTime = (gameLength) => {
	const gameLenMinutes = Math.floor(gameLength / 60);
	const gameLenSeconds = gameLength % 60;
	return `${gameLenMinutes.toString().padStart(2, '0')}:${gameLenSeconds
		.toString()
		.padStart(2, '0')}`;
};

const formatStartTime = (gameStartTime) => {
	return moment(gameStartTime).tz('Asia/Ho_Chi_Minh').format('YYYY-MM-DD HH:mm:ss');
};

module.exports = {
	sendDiscordMessage,
	sendLOLGameEndNotification,
	sendTFTGameEndNotification,
	getCurrentTime,
	handleApiError,
	getMatchResult,
	getTFTMatchResult,
	formatGameTime,
	formatStartTime,
};
