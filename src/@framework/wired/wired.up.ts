
export class Wired<T = any> {
	get tap(): () => T {
		return function data(): T | any {
		}
	}

	constructor() {
		console.log("Wired");
	}
}
