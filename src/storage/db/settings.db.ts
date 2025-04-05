import { Database, Changes, Statement } from 'bun:sqlite';

export interface ISettingsRow {
	name: string;
	type?: string | null;
	group?: string | null;
	value?: string | null;
	defValue?: string | null;
}

export class SettingsDatabase {
	private static instance: SettingsDatabase;
	private db: Database;
	private stmtGetSetting: Statement;
	private stmtGetAllSettings: Statement;
	private stmtExists: Statement;
	private stmtUpdateSetting: Statement;
	private stmtInsertSetting: Statement;
	private stmtUpdateValue: Statement;
	private stmtResetSetting: Statement;
	private stmtDeleteSetting: Statement;

	private constructor(dbPath?: string) {
		this.db = new Database(dbPath || ':memory:');
		this.db.run(`
			CREATE TABLE IF NOT EXISTS settingsTable (
				name TEXT PRIMARY KEY,
				type TEXT,
				group TEXT,
				value TEXT,
				defValue TEXT
			)
		`);

		this.stmtGetSetting = this.db.prepare("SELECT * FROM settingsTable WHERE name = ?");
		this.stmtGetAllSettings = this.db.prepare("SELECT * FROM settingsTable");
		this.stmtExists = this.db.prepare("SELECT 1 FROM settingsTable WHERE name = ?");
		this.stmtUpdateSetting = this.db.prepare("UPDATE settingsTable SET type = ?, group = ?, value = ?, defValue = ? WHERE name = ?");
		this.stmtInsertSetting = this.db.prepare("INSERT INTO settingsTable (name, type, group, value, defValue) VALUES (?, ?, ?, ?, ?)");
		this.stmtUpdateValue = this.db.prepare("UPDATE settingsTable SET value = ? WHERE name = ?");
		this.stmtResetSetting = this.db.prepare("UPDATE settingsTable SET value = defValue WHERE name = ?");
		this.stmtDeleteSetting = this.db.prepare("DELETE FROM settingsTable WHERE name = ?");
	}

	public static initialize(dbPath?: string): SettingsDatabase {
		if (!this.instance) {
			this.instance = new SettingsDatabase(dbPath);
		}
		return this.instance;
	}

	public getSetting(name: string): ISettingsRow | null {
		const row = this.stmtGetSetting.get(name);
		return row ? (row as ISettingsRow) : null;
	}

	public getAllSettings(): ISettingsRow[] {
		return this.stmtGetAllSettings.all() as ISettingsRow[];
	}

	public setSetting(setting: ISettingsRow): Changes {
		const exists = this.stmtExists.get(setting.name);
		if (exists) {
			return this.stmtUpdateSetting.run(setting.type, setting.group, setting.value, setting.defValue, setting.name);
		} else {
			return this.stmtInsertSetting.run(setting.name, setting.type, setting.group, setting.value, setting.defValue);
		}
	}

	public updateSettingValue(name: string, value: string): Changes {
		return this.stmtUpdateValue.run(value, name);
	}

	public resetSetting(name: string): Changes {
		return this.stmtResetSetting.run(name);
	}

	public deleteSetting(name: string): Changes {
		return this.stmtDeleteSetting.run(name);
	}

	public asInt(name: string): number | null {
		const setting = this.getSetting(name);
		if (!setting || setting.value === null) return null;
		const val = parseInt(setting?.value ?? '-1', 10);
		return isNaN(val) ? null : val;
	}

	public asFloat(name: string): number | null {
		const setting = this.getSetting(name);
		if (!setting || setting.value === null) return null;
		const val = parseFloat(setting?.value ?? '0');
		return isNaN(val) ? null : val;
	}

	public asBool(name: string): boolean | null {
		const setting = this.getSetting(name);
		if (!setting || setting.value === null) return null;
		const val = setting?.value?.toLowerCase();
		if (val === "true" || val === "1") return true;
		if (val === "false" || val === "0") return false;
		return null;
	}

	public asJSON(name: string): any {
		const setting = this.getSetting(name);
		if (!setting || setting.value === null) return null;
		try {
			return JSON.parse(setting?.value ?? '');
		} catch {
			return null;
		}
	}

	public asDate(name: string): Date | null {
		const setting = this.getSetting(name);
		if (!setting || setting.value === null) return null;
		const date = new Date(setting?.value ?? 0);
		return isNaN(date.getTime()) ? null : date;
	}
}
