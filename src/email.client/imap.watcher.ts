import "reflect-metadata";
import { ImapFlow }          from 'imapflow';
import { IIMAPConfig }       from "../strawberry.app.ts";
import { MailboxLockObject } from "imapflow";
import { ImapFlowOptions } from "imapflow";
import { EmailDatabase } from "../storage/db/email.db.ts";
import { simpleParser }               from 'mailparser';
import { IAttachment, IEmailMsgData } from '../storage/db/email.db.ts';
import { ParsedMail }                 from "mailparser";
import { AddressObject } from "mailparser";
import { IMailMessage } from "../storage/mail.message.type.ts";

/**
 * Use IMAP to listen for new emails and mark them as seen once received.
 * Calls the callback once per mail.
 * Passes the envelope and an array of the body parts to the callback.
 * @param {{host:string,username:string,password:string}} config login information of email client
 * @param {(envelope: import("imapflow").MessageEnvelopeObject, bodyParts: string[], attachments?: any[]) => any} callback called once per received mail
 * @param {number} refreshDelay delay in ms between email pulls
 * @returns {never} never
 */
export function onMail(config: Partial<IIMAPConfig>, callback: (newMail: IMailMessage) => void, refreshDelay = 1000) {
	connectMail(config, async (client: ImapFlow): Promise<void> => {
		const db = new EmailDatabase(); //container.resolve<EmailDatabase>(EmailDatabase);

		while (true) {
			// new mails
			const messages = [];

			// pull new mails
			for await (let message of client.fetch(
				{new: true},
				{
					uid          : true,
					envelope     : true,
					flags        : true,
					threadId     : true,
					bodyStructure: true,
					headers      : ["message-id", "in-reply-to", "references"],
					source       : true
				}
			)) {
				logger.log("Processing new email with UID:", message.uid);

				function parseAddressObject(address: AddressObject | AddressObject[] | undefined): string | null {
					return Array.isArray(address) ? address.map(addr => addr.text).join(', ') : address?.text || null;
				}

				try {
					// Parse the full email source using simpleParser
					const parsed: ParsedMail = await simpleParser(message.source);

					const attachments: IAttachment[] = parsed.attachments.map(att => ({
						filename   : att.filename,
						contentType: att.contentType,
						size       : att.size,
						content    : att.content
					}));

					const emailData: IEmailMsgData = {
						uid       : message.uid.toString(),
						messageId : parsed.messageId,
						inReplyTo : parsed.inReplyTo || null,
						references: typeof parsed.references === 'string' ? parsed.references :
									Array.isArray(parsed.references) ? parsed.references.join(' ') : null,
						from      : parsed.from?.text || null,
						to        : parseAddressObject(parsed.to) || null,
						cc        : parseAddressObject(parsed.cc),
						subject   : parsed.subject || null,
						date      : parsed.date?.toISOString() || null,
						textBody  : parsed.text || null,
						htmlBody  : parsed.html || null,
						threadId  : message.threadId?.toString() || null,
						flags     : Array.isArray(message.flags) ? message.flags : [],
						seen      : message.flags.has('\\Seen')
					};

					const result = db.storeEmail(emailData, attachments);
					if (result.success) {
						//await client.messageFlagsAdd(message.uid.toString(), ["\\Seen"], { uid: true });
						callback(emailData); // message.envelope, [parsed.text], attachments);
					} else {
						console.error("Store failed:", result.error);
					}

				} catch (error: any) {
					console.error("Error processing email:", error);
				}
			}

			await wait(refreshDelay);

		} // end while
	});
}


const AsyncFunction = (async () => { }).constructor;

/**
 * Aquire mailbox lock, execute callback, then release mailbox lock. Exception safe.
 * @param {ImapFlow} client
 * @param {(client: ImapFlow) => any} callback the mailclient is passed to the callback
 * @returns {Promise<void>} returns after callback finished
 */
async function withLock(client: ImapFlow, callback: (client: ImapFlow) => any): Promise<void> {
  let error = null;

  // aquire lock
  const lock: MailboxLockObject | void = await client.getMailboxLock("INBOX").catch((err: any): void => {
    error = `Aquiring lock failed: ${err}`;
  });
  
  // throw if an error was encountered
  if (error !== null) throw error;

  // different syntax for async functions
  if (callback instanceof AsyncFunction) {
    // execute callback
    await callback(client)
      // write error to error variable
      .catch((err: any) => error = err)
      // release lock after execution
      .finally(() => { if (lock) lock.release()});
  } else {
    try {
      // execute callback
      callback(client);
    } catch (err) {
      // write error to error variable
      error = err;
    }
    // release lock after execution
    if (lock) lock.release();
  }

  // throw if an error was encountered
  if (error !== null) throw error;
}

/**
 * Connect to mailserver and aquire lock.
 * MailClient is passed to callback.
 * Automatically releases lock and logs out client after callback finishes.
 * @param {{host:string,username:string,password:string}} auth
 * @param {(client: ImapFlow) => any} callback
 * @returns {Promise<void>} returns after callback finished
 */
async function connectMail(auth: Partial<IIMAPConfig>, callback: (client: ImapFlow) => Promise<void>) {
  // create email client
  // @ts-ignore
  const flowOptions: ImapFlowOptions = {
    host: auth.host!,
    port: auth.port!,
    secure: true,
    auth: {
      user: auth.user!,
      pass: auth.password,
    },
    emitLogs: false,
    logger: console
  };

   logger.log("Connecting to mailserver::", flowOptions);

  const client = new ImapFlow(flowOptions);

  // connect to email server
  await client.connect().catch(err => {
    throw `Connection Failed: ${err.responseText}`;
  });

  // aquire lock and execute callback
  await withLock(client, callback);

  await client.logout();
}

/**
 * Wait for the specified amount of time
 * @param {number} time the amount of milliseconds to wait
 * @returns {Promise<void>} returns when time has passed
 */
function wait(time: any) {
  return new Promise(res => setTimeout(res, time));
}
