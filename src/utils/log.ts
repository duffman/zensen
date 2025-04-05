export const logger = {
	log: (...data: any[]) => {
		console.log("LOG ::", data);
	},
	error: (...data: any[]) => {
		console.log("error ::", data);
	},
};
