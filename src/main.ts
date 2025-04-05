import "reflect-metadata";
import { AppSettings }  from "./Application";
import { ImapManager }  from "./trumpmail/ImapManager";
import { watchMail }    from "./email.client/zenmail.client";
import { IMailMessage } from "./storage/mail.message.type";

const CONFIG_TOKEN = Symbol('CONFIG_TOKEN');
const CONFIG       = {
	APP : Symbol('CFG_ALL'),
	IMAP: Symbol('CFG_IMAP'),
}

//ImapManager()

export class App {
	private imapManager: ImapManager;

	constructor(
	) {
		this.imapManager = new ImapManager();
		this.imapManager.on("mail", (msg) => {
			console.log("New email received:", msg.from);
			//console.log("New email received:", msg.from);
			//console.log("Subject:", msg.subject);
		});

		this.imapManager.run();
	}
}



 watchMail(AppSettings.mail.imap, async (msg: IMailMessage): Promise<void> => {
 console.log("New email received:", msg.from);
 //console.log("New email received:", msg.from);
 //console.log("Subject:", msg.subject);
 }, AppSettings.mail.refreshDelay);

process.stdin.resume();
