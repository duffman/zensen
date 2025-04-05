import postgres, { Sql }                            from 'postgres';
import Imap                                         from 'imap';
import nodemailer, { Transporter, SendMailOptions } from 'nodemailer';
import { ImapFlowOptions }                          from "imapflow";
import { AppSettings }                              from "./Application";
import { SettingsDatabase }                         from "./storage/db/settings.db";
import { inject }                                   from "tsyringe";

interface Email {
	id: number;
	messageId: string;
		sender: string;
	recipient: string;
	subject: string;
	body: string;


}

export interface IIMAPConfig extends Partial<ImapFlowOptions>{
	devMode?: boolean;
	user: string;
	password: string;

}

export class IMAPConfig implements Partial<IIMAPConfig> {


	constructor(public devMode: boolean = false) {
	}

	public auth: { user: string, pass?: string }	 = {
		user: AppSettings.mail.imap.auth.user,
		pass: AppSettings.mail.imap.auth.pass
	}

	public host: string     = 'imap.zoho.com';
	public port: number     = 993;
}

export interface ISMTPConfig {
	host: string;
	port: number;
	secure: boolean;
	auth: {
		user: string;
		pass: string;
	};
}

class StrawberryApp {

	private readonly sql: Sql<{}>;
//	private readonly imap: Imap;
	private readonly transporter: Transporter;



	constructor(@inject('SettingsDatabase') private settings: SettingsDatabase) {
		this.sql = postgres(
			{
				host    : process.env.DATABASE_HOST ?? 'coldmind.dev',
				port    : Number(process.env.DATABASE_PORT) || 5432,
				database: process.env.DATABASE_NAME ?? 'zenmail',
				username: process.env.DATABASE_USER ?? 'coldmind',
				password: process.env.DATABASE_PASS ?? 'bjoe7151212',
			});

//		this.imap                     = new Imap;

		const smtpConfig: ISMTPConfig = {
			host  : 'coldmind.dev',
			port  : 587, // Adjust to 465 if SSL
			secure: false, // True for 465, false for 587 with TLS
			auth  : {
				user: process.env.EMAIL_USER ?? 'help@zenmail.ai',
				pass: process.env.EMAIL_PASS ?? 'your-email-password', // Replace with actual password
			},
		};
		this.transporter              = nodemailer.createTransport(smtpConfig);


	}

/*	private async insertEmail(email: Omit<Email, 'id' | 'timestamp'>): Promise<void> {
//		const embedding: number[] = await this.embeddings.embedQuery(email.body);
		await this.sql`
/      INSERT INTO emails (message_id, thread_id, sender, recipient, subject, body, embedding)
      VALUES (${email.messageId}, ${email.threadId}, ${email.sender}, ${email.recipient}, ${email.subject}, ${email.body}, ${embedding}::vector)
      ON CONFLICT (message_id) DO NOTHING
    `;
	}

	private async getThreadEmails(threadId: string): Promise<Email[]> {
		const result: Email[] = await this.sql`SELECT * FROM emails WHERE thread_id = ${threadId} ORDER BY timestamp ASC`;
		return result;
	}*/


	/*
	private generateMessageId(): string {
		return `<${Date.now()}-${crypto.randomUUID()}@zenmail.ai>`;
	}

	private async processEmail(formData: Map<string, string>): Promise<string> {
		const from: string             = formData.get('from') ?? '';
		const to: string               = formData.get('to') ?? '';
		const subject: string          = formData.get('subject') ?? '';
		const body: string             = formData.get('body-plain') ?? '';
		const messageId: string        = formData.get('message-id') ?? '';
		const inReplyTo: string | null = formData.get('in-reply-to') ?? null;
		const references: string       = formData.get('References') ?? '';

		if (to !== 'help@zenmail.ai') return 'Ignored non-help email';

		let threadId: string = messageId;
		if (inReplyTo) {
			const parent: Email[] = await this.sql`SELECT thread_id FROM emails WHERE message_id = ${inReplyTo}`;
			const threadId        = parent[0]?.threadId;
		}

		const incomingEmail: Omit<Email, 'id' | 'timestamp'> = {
			messageId,
			threadId,
			sender   : from,
			recipient: to,
			subject,
			body,
		};
		await this.insertEmail(incomingEmail);

		const threadEmails: Email[] = await this.getThreadEmails(threadId);
		for (const email of threadEmails) {
			const role: 'ai' | 'human' = email.sender === 'help@zenmail.ai' ? 'ai' : 'human';
			await this.chain.memory.saveContext(
				{input: email.body},
				{output: role === 'ai' ? email.body : ''}
			);
		}

		const response: { response: string } = await this.chain.call({input: body});
		const responseText: string           = response.response;

		const responseMessageId: string    = this.generateMessageId();
		const newReferences: string        = references ? `${references} ${messageId}` : messageId;
		const mailOptions: SendMailOptions = {
			from   : 'help@zenmail.ai',
			to     : from,
			subject: subject.startsWith('Re:') ? subject : `Re: ${subject}`,
			text   : responseText,
			headers: {
				'In-Reply-To': messageId,
				'References' : newReferences,
				'Message-Id' : responseMessageId,
			},
		};
		await this.transporter.sendMail(mailOptions);

		const responseEmail: Omit<Email, 'id' | 'timestamp'> = {
			messageId: responseMessageId,
			threadId,
			sender   : 'help@zenmail.ai',
			recipient: from,
			subject  : `Re: ${subject}`,
			body     : responseText,
		};
	//	await this.insertEmail(responseEmail);

		return 'Email processed';
	}


	public async stop(): Promise<void> {
		this.imap.end();
		await this.sql.end();
	}*/
}
