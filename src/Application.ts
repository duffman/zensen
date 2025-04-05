import postgres from 'postgres';
import { OpenAIEmbeddings, ChatOpenAI } from '@langchain/openai';
import { ConversationChain } from 'langchain/chains';
import { BufferMemory } from 'langchain/memory';
import crypto from 'crypto';
import { ImapFlowOptions } from "imapflow";
import { SmtpConfig } from "./trumpmail/interfaces/MailboxJsConfig.ts";
import { ImapConfig } from "./trumpmail/interfaces/MailboxJsConfig.ts";
import { MailboxJs } from "./trumpmail";
import { MailboxJsConfig } from "./trumpmail/interfaces/MailboxJsConfig.ts";

export interface IIMAPConf extends ImapFlowOptions{
}



export interface IAppSettings {
	db: {
		host: string;
		port: number;
		database: string;
		username: string;
		password: string;
	};
	mail: {
		refreshDelay: number;
		mailgun: {
			apiKey: string | undefined;
			domain: string | undefined;
		};
		imap: IIMAPConf;
		smtp: {
			username: string;
			password: string;
			host: string;
			port: number;
		};
		openAI: {
			apiKey: string | undefined;
		};
		email_support?: string;
	};
}

export const AppSettings: IAppSettings = {
	db: {
		host: process.env.DATABASE_HOST || 'coldmind.dev',
		port: Number(process.env.DATABASE_PORT) || 5432,
		database: process.env.DATABASE_NAME || 'zenmail',
		username: process.env.DATABASE_USER || 'coldmind',
		password: process.env.DATABASE_PASS || 'bjoe7151212',
	},
	mail: {
		refreshDelay: 1000 * 60 * 1, // 5 minutes
		mailgun      : {
			apiKey: process.env.MAILGUN_API_KEY,
			domain: process.env.MAILGUN_DOMAIN
		},
		imap         : {
			auth: {
				user: "agentx@coldmind.com",
				pass: "!Android715",
			},
			host    : "imap.zoho.com",
			port    : 993
		},
		smtp         : {
			username: "agentx@coldmind.com",
			password: "!Android715",
			host    : "imap.zoho.com",
			port    : 993
		},
		openAI       : {
			apiKey: process.env.OPENAI_API_KEY
		},
		email_support: ''
	}
}

export const CfgMailbox: MailboxJsConfig = {
	name     : 'zenmail',
	user     : AppSettings.mail.imap.auth.user,
	password : (AppSettings.mail.imap.auth.pass ?? '')!,
	reconnectInterval: 1000 * 60 * 5, // 5 minutes
	imap: {
		host: AppSettings.mail.imap.host,
		port: AppSettings.mail.imap.port,
		tls: true,
	},
	smtp: {
		host: AppSettings.mail.smtp.host,
		port: AppSettings.mail.smtp.port,
		tls: true,
	}
}


// Config
//const sql = postgres(AppSettings.db);

const embeddings = new OpenAIEmbeddings({ openAIApiKey: process.env.OPENAI_API_KEY });
const llm = new ChatOpenAI({ openAIApiKey: process.env.OPENAI_API_KEY, modelName: 'gpt-4' });
const memory = new BufferMemory();
const chain = new ConversationChain({ llm, memory });

// Email interface
export interface Email {
	id: number;
	messageId: string;
	threadId: string;
	sender: string;
	recipient: string;
	subject: string;
	body: string;
	embedding?: number[];
	timestamp: Date;
}

// Helper functions
async function insertEmail(email: Omit<Email, 'id' | 'timestamp'>) {
	const embedding = await embeddings.embedQuery(email.body);
	await sql`
    INSERT INTO emails (message_id, thread_id, sender, recipient, subject, body, embedding)
    VALUES (${email.messageId}, ${email.threadId}, ${email.sender}, ${email.recipient}, ${email.subject}, ${email.body}, ${embedding}::vector)
  `;
}

async function getThreadEmails(threadId: string): Promise<Email[]> {
	return await sql`SELECT * FROM emails WHERE thread_id = ${threadId} ORDER BY timestamp ASC`;
}

function generateMessageId(): string {
	return `<${Date.now()}-${crypto.randomUUID()}@zenmail.ai>`;
}

// Main processing function
export async function processEmail(formData: Map<string, string>): Promise<string> {
	const asString = (key: string): string => {
		return JSON.stringify(formData.get(key));
	}

	const from = asString('from');
	const to = asString('to');
	const subject = asString('subject');
	const body = asString('body-plain');
	const messageId = asString('message-id');
	const inReplyTo = asString('in-reply-to') || null;
	const references = asString('References') || '';

	if (to !== 'help@zenmail.ai') return 'Ignored non-help email';

	// Determine thread_id
	let threadId = messageId;
	if (inReplyTo) {
		const parent = await sql`SELECT thread_id FROM emails WHERE message_id = ${inReplyTo}`;
		if (parent.length) threadId = parent[0]?.thread_id;
	}

	// Store incoming email
	await insertEmail({ messageId, threadId, sender: from, recipient: to, subject, body });

	// Load thread history into memory
	const threadEmails = await getThreadEmails(threadId);
	for (const email of threadEmails) {
		const role = email.sender === 'help@zenmail.ai' ? 'ai' : 'human';
		await memory.saveContext(
			{ input: email.body },
			{ output: role === 'ai' ? email.body : '' }
		);
	}

	// Generate response
	const response = await chain.call({ input: body });
	const responseText = response.response;

	// Send response
	const responseMessageId = generateMessageId();
	const newReferences = references ? `${references} ${messageId}` : messageId;


	/*await mailgun.messages().send({
									  from: 'help@zenmail.ai',
									  to: from,
									  subject: subject.startsWith('Re:') ? subject : `Re: ${subject}`,
									  text: responseText,
									  'h:In-Reply-To': messageId,
									  'h:References': newReferences,
									  'h:Message-Id': responseMessageId,
								  });
	*/
	// Store response
	await insertEmail({
						  messageId: responseMessageId,
						  threadId,
						  sender: 'help@zenmail.ai',
						  recipient: from,
						  subject: `Re: ${subject}`,
						  body: responseText,
					  });

	return 'Email processed';
}
