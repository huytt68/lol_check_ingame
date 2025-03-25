const axios = require('axios');
const moment = require('moment-timezone');
const clc = require('cli-color');

const sendDiscordMessage = async (webhookUrl, data) => {
	try {
		await axios.post(webhookUrl, data);
	} catch (error) {
		console.error('Lỗi khi gửi thông báo Discord:', error.message);
	}
};

const sendGameEndNotification = async (webhookUrl, matchId, riotId) => {
	const timestamp = new Date().toISOString();
	await sendDiscordMessage(webhookUrl, {
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

module.exports = {
	sendDiscordMessage,
	sendGameEndNotification,
	formatGameTime,
	formatStartTime,
	getCurrentTime,
	handleApiError,
};
