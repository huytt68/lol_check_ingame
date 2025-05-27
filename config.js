// Danh sách PUUID của các người chơi
const PUUIDS = [
	'kDCBiPhDSjRRcynFvWvIDJ0DcDOibp96iVs0p_YHyQMuiXie2cRIpsZQSn5ugzXldIVJRIT3OoByBw', //Canh
	'A8EPhv7ChKwa3N12oTC2zZ6R-RFe0l3QSC4IaR09ccp6l7leiHuq7vM3cFEXui8zUICX6xC6NIAYvQ', //WX-78
	'5_rMZmg-6iXhmXyt6KDkvlG3fLFBi_cXQzrT6wjTINsDOXttKjGFTLqZ1MCis4Y9hKLeSHTip7BhVQ', //Thanh
	'g0TrnM_G4cv05AAuUcbZv_Aq5sJVTMD9zqm5rE-qb1gT1V7j9FVGBm9O5mwUCu6pFypoGDPjcqBO2g', //cng
	'Mf2G9VDyxPNzMWXIFG3XUrZokeb9DnmUJbjU4DaguBwHGQPzfw8UM88ag5XYp2RQ5QCphqFpUINpEg', //Tung
	'tFWexGScpheDQ0FynXm4DzqwfLxOArQeea8x_aAk-1DTryI8iHLnhlm_mY4McvI1SpLax95UqQz0pQ', //Buom
	'gMh-RKvgTnZ40G9PfbA1QZ56cuQvUoAv-JkGGIaX32FJSWqABWELrQK5ZS4Xta2PTlIll7jSGT3s5Q', //Duke
	'Zfl6WezAOAyt0BEjAD2ThV25eJr1MIGHkG2OHfj7fPuxvoEzTyZna2FaPSBct-YKEAY6fV4G8vYL_w', //Vinh
	'SEmrr51edIxdP0jKYh06wSG5oT1tTBs8Gu-YRWvLVVBDNANEd4Hn5OE_Q4wnqpvdkJZkAYuiCDF6Gw', //Longter
	'-W501c8FUJByT6vwR4NcUBm0SdEVMMqLo84pS7Vqb-Ydh3y4gucm7FvD4ZLaRX2mozEi3Ra7R4pOUg', //Manh
	'vlJzxNCdhjYDvadtKmAXh-O9-4N5IE-KP6ItgkPkHAffnGb6NP17loR-b5VJHgjejtqlZCArJC_PpQ', //cutu
	'TzfJzBxZn943qcX8yvdYZvYvlx2L71HBUal6wojrNL7JQu2dF_rJMkPe_ymJRZ2e5DF1O0MXT5-YDg', //huytt
	// 'irAHQZLL8N4q0k24US1JJCjdLW1aQ0Ctayp_kJBiY_sZ_x1htJzA5yEeNR_5EwDAnLR7_f4BKTEigw', //CaosTT
	// '1EmQxT3gq2DnLoj7441n19SeAkOo5WoPelDbeRBH2nv7yAgEbDj-KSQds9K8VvBk-xAUi7pCMCLPbA', //KS1A AQUAFINA#7190
	// 'WO1xf2bjiXhw9OMNewnCtnN8DshtX5g7WA8R8FYOT0a3qaorjx5mxwprIBAzY8xquKU2X_TnEv4-WA', //PAP Barrel#7274
	// 'kJ8JH0eI3x2E-EWAZoXe21aa8D6LkPJzV34UEIwQ2_aFZ8qnD1-ECrCKHtkJt-xWwS0s0pbnsJaA4w', //TýBúnTýRauLàXong#enddy
	// 'XJu3E7uyXyXA8_cy_u2zvkE6w84WbyDxN-ymgfyYIN9lIavboS2JstZOd8ld8Y56ygLSrbX6ZpBpUA', //ChùaÔnqPhật#vn2
	// 'JjiPqygbcETh2wXg7zkHtqfj5Qsh8PKHavL9uSvN-qd8eDJKePJ7Z6Z49WbUu07wYEoLBr3vxhp6ow', //Hợp Hoan Công Tử#208
	// 'fm6FGdXMFnVbW_rw4U5otRpWqYpGDeCw7n5K5gaipx52faXwJMEi0kVbOxPFlQ06159DYerAYjiExg', //Th 15 06 2018 Tr#vn2
	// '8SRVe06ExkmflYiCbHr0FBQ2MkvkY6d8rLv4k5DMW07EKhgxtwE2_LdgLO9WfKUg_ijuWwMg93HhcQ', //My Gun Đang Cứng#7409
	// 'NzcQDpf9yDfdMVJrqxshPJRJzxyMBEDFa50cosd0HXZRh-Tt3nzpng3J9hk5HYgCGSpyT0QJI3xWfw', //tu duy nguoc#2k3
	// 'MLHoUj4xOszS8B2LdiZTpN3ipz1Nlj6YgWKfzi4E84thA1Hk3slz7MyWIXmaIwrLxZcrIldp9mn0Iw', //Ai Kalb al Asad#Sol7
	// 'heUzdCZgYtNfW4t7zxb1Mh2dDWZweQ_HW1gliA4aKrKhoTU4YVNGWSNR6hzyVveFEwEmDQpiPKQeEw', //AURELION SOL#VN19
	// 'F8bPKnvVtc5mxlSqKDmgN2Yrv2_ZZzSmJ0xEa4joDxI5VBgJ8qPQQ11pA3VICMDL8syI_slYz3C20Q', //Ngon Ngọt Ngào#vn2
	// 'ATOL2TEygHwQOe7KYqbhB6gkRlH9TySAztOmGTKFb3xzh5mu1UDPMwFG-1BRnmzDY2QmVJtDkNHRPA', //Darius Đệ Nhị#vn2
	// 'em0KSYv6xH5evX0mHPNtaogvYyRB2KfO4q10-c4fcyva4pP_2SAIR2b7XSwn_csl64hpCOXDwGWd5Q', //J97 Sóng gió#33333
	// 'NBHP2hPgLCNgArxPA5WnfjpMtsTtXzzY0ZiQ_omLtvHSPZR1DxaAJRER6DCIMq9utqruBvV5AYOT5A', //TruongLil#張遼6
	// 'cKx_WcktNg8ryDxOfoOufgmw8P2XSky5_7ij-d9_G4Id0GTlvWiFR99RNT61y8Lqyd-us7veGmpbRg', //Con Bò Kho#2510
	// 'rGeeN3E4QdhrJfM4liStksVoz2-jUoa6rvyG985CZL8-w-yxZ6CFr4qZxEvJRVGclPi4tQOH1WYH9w', //Heo Bánh Bèo#vn2
	// 'd56mJQ58JOyVMvF5_k19J1fWGpsVmuZ2Op0THQL7mSkEV41Xe1myusNRH3Q-uT8DZOwkzSbXD_7RMg', //god#blnt
	// 'bAExS_xMyNFLCy5BCf1f-X-sy3qJYME-CW_cD1ajvVDmAdAp7tj-QfF4WDA72CPPFwkfH6BCkpgFlQ', //SweetnSpicy#vn2
];

module.exports = {
	PUUIDS,
};
