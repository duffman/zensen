import "reflect-metadata";
import { ImapFlow, MailboxLockObject, FetchQueryObject } from 'imapflow';
import { IIMAPConfig } from "../strawberry.app.ts";
import { ImapFlowOptions }                           from "imapflow";
import { EmailDatabase, IAttachment, IEmailMsgData } from "../storage/db/email.db.ts";
import { simpleParser, ParsedMail, AddressObject }   from 'mailparser';
import { IMailMessage } from "../storage/mail.message.type.ts";
import { getConfig }                                     from "@langchain/langgraph";
import { SearchObject }                                  from "imapflow";
import { AppSettings }                                   from "../Application.ts";
import { IMAPConfig }                                    from "../strawberry.app.ts";

// Predefined search filter
const SEARCH_QUERY = (): SearchObject => {
	return {
		new: false
	}
};

// Predefined fetch options
const FETCH_OPTIONS: FetchQueryObject = {
	uid: true,
	envelope: true,
	flags: true,
	threadId: true,
	bodyStructure: true,
	headers: ["message-id", "in-reply-to", "references"],
	source: true
};



// Create IMAP config once
function createImapConfig(config?: Partial<IIMAPConfig>): ImapFlowOptions {
	const imapConfig: Partial<IMAPConfig> = AppSettings.mail.imap ?? config ?? null;
	return {
		host: imapConfig.host ?? config?.host ?? '',
		port: imapConfig.port ?? config?.port ?? 993,
		secure: true,
		auth: {
			user: imapConfig.user ?? config?.user ?? '',
			pass: imapConfig.password ?? config?.password ?? '',
		},
		emitLogs: false,
	};
}

function getConfig(): {
	imap: Partial<IIMAPConfig>,
	query: SearchObject }
{

	return {
		imap: createImapConfig(),
		query: SEARCH_QUERY()
}
}


// Create IMAP client
function createImapClient(config: ImapFlowOptions): ImapFlow {
	return new ImapFlow(config);
}

export function watchMail(config: Partial<IIMAPConfig>, callback: (newMail: IMailMessage) => Promise<void>, refreshDelay = 1000): { mailCallback: (newMail: IMailMessage) => Promise<void>; disconnect: () => void } {
	let keepListening = true;
	const db = new EmailDatabase();
	const imapConfig = createImapConfig(config);

	const disconnect = () => {
		keepListening = false;
	};

	(async () => {
		while (keepListening) {
			let client: ImapFlow | undefined;
			let lock: MailboxLockObject | undefined;

			try {
				client = createImapClient(imapConfig);
				await client.connect();
				lock = await client.getMailboxLock("INBOX");

				for await (let message of client.fetch(SEARCH_QUERY(), FETCH_OPTIONS)) {
					if (!keepListening) break;

					try {
						console.log("Processing new email with UID:", message.uid);
						const parsed: ParsedMail = await simpleParser(message.source);

						const attachments: IAttachment[] = parsed.attachments.map(att => ({
							filename: att.filename,
							contentType: att.contentType,
							size: att.size,
							content: att.content
						}));

						const emailData: IEmailMsgData = {
							uid: message.uid.toString(),
							messageId: parsed.messageId,
							inReplyTo: parsed.inReplyTo || null,
							references: typeof parsed.references === 'string' ? parsed.references :
										Array.isArray(parsed.references) ? parsed.references.join(' ') : null,
							from: parsed.from?.text || null,
							to: parseAddressObject(parsed.to) || null,
							cc: parseAddressObject(parsed.cc),
							subject: parsed.subject || null,
							date: parsed.date?.toISOString() || null,
							textBody: parsed.text || null,
							htmlBody: parsed.html || null,
							threadId: message.threadId?.toString() || null,
							flags: Array.isArray(message.flags) ? message.flags : [],
							seen: message.flags.has('\\Seen')
						};

						const result = db.storeEmail(emailData, attachments);
						if (result.success) {
							await client.messageFlagsAdd(message.uid.toString(), ["\\Seen"], { uid: true });
							await callback(emailData);
						} else {
							console.error("Store failed:", result.error);
						}
					} catch (error: any) {
						console.error("Error processing email:", error);
					}
				}

				if (keepListening) await wait(refreshDelay);
			} catch (error: any) {
				console.error("Connection or fetch error, retrying:", error);
				if (keepListening) await wait(5000);
			} finally {
				if (lock) {
					try {
						lock.release();
					} catch (releaseError: any) {
						console.error("Lock release failed:", releaseError);
					}
				}
				if (client) {
					try {
						await client.logout();
					} catch (logoutError: any) {
						console.error("Logout failed:", logoutError);
					}
				}
			}
		}
	})();

	return {
		mailCallback: callback,
		disconnect
	};
}

function parseAddressObject(address: AddressObject | AddressObject[] | undefined): string | null {
	return Array.isArray(address) ? address.map(addr => addr.text).join(', ') : address?.text || null;
}

function wait(time: number): Promise<void> {
	return new Promise(res => setTimeout(res, time));
}
