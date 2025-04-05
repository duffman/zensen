import { Database } from 'bun:sqlite';
import { Statement } from "bun:sqlite";
import { IAttachmentRecord } from "./tables.types";
import { IEmailRecord } from "./tables.types";
import { IAction } from "../../@framework/action/action.event";
import { Changes } from "bun:sqlite";

// Define types for our data structures
export interface IEmailMsgData {
	uid: string;
	messageId?: string | null;
	inReplyTo?: string | null;
	references?: string | null;
	from?: string | null;
	to?: string | null;
	cc?: string | null;
	subject?: string | null;
	date?: string | null;
	textBody?: string | null;
	htmlBody?: string | null;
	threadId?: string | null;
	flags?: string[] | null;
	seen?: boolean;
	processed?: boolean;
}

interface IAttachment {
	filename?: string;
	contentType?: string;
	size?: number;
	content?: Buffer | null;
}

interface DatabaseResult<T = any> extends IAction<T> {
	success: boolean;
	error?: string;
}

interface EmailResult extends DatabaseResult {
	emailId?: number;
}

interface GetEmailResult extends DatabaseResult {
	email?: any;
	attachments?: any[];
}

interface GetThreadResult extends DatabaseResult {
	emails?: any[];
}

interface UpdateResult extends DatabaseResult {
	updated?: boolean;
}

// Initialize SQLite database
const db: Database = new Database('email_new.sqlite');


export class EmailDatabase {
	constructor() {
		// Initialize the database
		this.initializeDatabase();
	}

	initializeDatabase(): DatabaseResult {
		return initializeDatabase();
	}

	storeEmail(emailData: IEmailMsgData, attachments: IAttachment[] = []): EmailResult {
		return storeEmail(emailData, attachments);
	}

	markEmailAsSeen(uid: string): UpdateResult {
		return markEmailAsSeen(uid);
	}

	getEmailByUid(uid: string): GetEmailResult {
		return getEmailByUid(uid);
	}

	getEmailsByThreadId(threadId: string): GetThreadResult {
		return getEmailsByThreadId(threadId);
	}

	closeDatabase(): DatabaseResult {
		return closeDatabase();
	}
}


// Create tables if they don't exist
function initializeDatabase(): DatabaseResult {
	try {
		db.run(`
      CREATE TABLE IF NOT EXISTS emails (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        uid TEXT NOT NULL,
        message_id TEXT,
        in_reply_to TEXT,
        "references" TEXT,
        from_address TEXT,
        to_address TEXT,
        cc TEXT,
        subject TEXT,
        date TEXT,
        body_text TEXT,
        body_html TEXT,
        thread_id TEXT,
        flags TEXT,
        seen INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

		db.run(`
      CREATE TABLE IF NOT EXISTS attachments (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        email_id INTEGER,
        filename TEXT,
        content_type TEXT,
        size INTEGER,
        content BLOB,
        FOREIGN KEY (email_id) REFERENCES emails (id)
      )
    `);

		// Create indices for faster lookups
		db.run('CREATE INDEX IF NOT EXISTS idx_emails_uid ON emails (uid)');
		db.run('CREATE INDEX IF NOT EXISTS idx_emails_message_id ON emails (message_id)');
		db.run('CREATE INDEX IF NOT EXISTS idx_emails_thread_id ON emails (thread_id)');

		console.log('Database initialized successfully');
		return { success: true };
	} catch (error) {
		const errorMessage = error instanceof Error ? error.message : String(error);
		console.error('Database initialization error:', errorMessage);
		return { success: false, error: errorMessage };
	}
}

// Store an email and its attachments in the database
function storeEmail(emailData: IEmailMsgData, attachments: IAttachment[] = []): EmailResult {
	// Prepare statements
	const insertEmailStmt = db.prepare(`
    INSERT INTO emails (
      uid, message_id, in_reply_to, "references", from_address, to_address, 
      cc, subject, date, body_text, body_html, thread_id, flags, seen
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

	const insertAttachmentStmt = db.prepare(
		`
        INSERT INTO attachments (
          email_id, filename, content_type, size, content
        ) VALUES (?, ?, ?, ?, ?)
		`
	);

	try {
		// Begin transaction
		db.run('BEGIN TRANSACTION');

		// Insert email data
		insertEmailStmt.run(
			emailData.uid,
			emailData.messageId ?? null,
			emailData.inReplyTo ?? null,
			emailData.references ?? null,
			emailData.from ?? null,
			emailData.to ?? null,
			emailData.cc ?? null,
			emailData.subject ?? null,
			emailData.date ?? null,
			emailData.textBody ?? null,
			emailData.htmlBody ?? null,
			emailData.threadId ?? null,
			emailData.flags ? JSON.stringify(emailData.flags) : null,
			emailData.seen ? 1 : 0
		);

		// Get the last inserted email ID
		const result = db.query('SELECT last_insert_rowid() as id').get() as { id: number };
		const emailId = result.id;

		// Store attachments if any
		if (attachments && attachments.length > 0) {
			for (const attachment of attachments) {
				insertAttachmentStmt.run(
					emailId,
					attachment.filename ?? 'unnamed',
					attachment.contentType ?? 'application/octet-stream',
					attachment.size ?? 0,
					attachment.content ?? null
				);
			}
		}

		// Commit transaction
		db.run('COMMIT');

		// Finalize prepared statements
		insertEmailStmt.finalize();
		insertAttachmentStmt.finalize();

		return { success: true, emailId };

	} catch (error) {
		// Rollback transaction if there was an error
		db.run('ROLLBACK');

		// Finalize prepared statements
		if (insertEmailStmt) insertEmailStmt.finalize();
		if (insertAttachmentStmt) insertAttachmentStmt.finalize();

		const errorMessage = error instanceof Error ? error.message : String(error);
		console.error('Database error:', errorMessage);
		return { success: false, error: errorMessage };
	}
}

// Mark an email as seen in the database
function markEmailAsSeen(uid: string): UpdateResult {
	try {
		const result: Changes = db.run('UPDATE emails SET seen = 1 WHERE uid = ?', [uid]);
		return {
			success: true,
			updated: result.changes > 0
		};
	} catch (error) {
		const errorMessage = error instanceof Error ? error.message : String(error);
		console.error('Error marking email as seen:', errorMessage);
		return { success: false, error: errorMessage };
	}
}

// Get email by UID
function getEmailByUid(uid: string): GetEmailResult {
	try {
		const queryStmt: Statement<IEmailRecord> = db.query('SELECT * FROM emails WHERE uid = ?');

		let filesRecList: IAttachmentRecord[] | null = [];
		const emailRec: IEmailRecord | null = queryStmt.get([uid]);

		if (emailRec !== null) {
			// Get attachments for this email
			const filesSmt: Statement<IAttachmentRecord> = db.query(
				'SELECT id, filename, content_type, size FROM attachments WHERE email_id = ?'
			);

			filesRecList = filesSmt.all(emailRec!.id);
		}

		return {
			success: true,
			email: emailRec,
			attachments: filesRecList
		};

	} catch (error) {
		const errorMessage = error instanceof Error ? error.message : String(error);
		console.error('Error getting email:', errorMessage);
		return { success: false, error: errorMessage };
	}
}

// Get all emails in a thread
function getEmailsByThreadId(threadId: string): GetThreadResult {
	try {
		const queryStmt: Statement<IEmailRecord> = db.query(
			'SELECT * FROM emails WHERE thread_id = ? ORDER BY date ASC'
			  );

		const emails: IEmailRecord[] = queryStmt.all([threadId]);

		return {
			success: true,
			emails
		};

	} catch (error) {
		const errorMessage = error instanceof Error ? error.message : String(error);
		console.error('Error getting thread emails:', errorMessage);
		return { success: false, error: errorMessage };
	}
}

// Close the database connection
function closeDatabase(): DatabaseResult {
	try {
		db.close();
		return { success: true };
	} catch (error) {
		const errorMessage = error instanceof Error ? error.message : String(error);
		console.error('Error closing database:', errorMessage);
		return { success: false, error: errorMessage };
	}
}

// Export all functions
export {
	initializeDatabase,
	storeEmail,
	markEmailAsSeen,
	getEmailByUid,
	getEmailsByThreadId,
	closeDatabase,
	// Export types
	IAttachment,
	DatabaseResult,
	EmailResult,
	GetEmailResult,
	GetThreadResult,
	UpdateResult
};

// Usage example
/*
 import { initializeDatabase, storeEmail, markEmailAsSeen, EmailData, Attachment } from './email-database';

 // Initialize database
 initializeDatabase();

 // Example email data (this would come from your email client/parser)
 const emailData: EmailData = {
 uid: "12345",
 messageId: "<example@mail.com>",
 inReplyTo: "<previous@mail.com>",
 references: "<thread@mail.com>",
 from: "sender@example.com",
 to: "recipient@example.com",
 cc: "cc@example.com",
 subject: "Test Email",
 date: new Date().toISOString(),
 textBody: "This is a test email",
 htmlBody: "<p>This is a test email</p>",
 threadId: "thread-123",
 flags: ["\\Seen", "\\Flagged"],
 seen: false
 };

 // Example attachments
 const attachments: Attachment[] = [
 {
 filename: "test.pdf",
 contentType: "application/pdf",
 size: 12345,
 content: Buffer.from("test content")
 }
 ];

 // Store the email
 const result = storeEmail(emailData, attachments);

 if (result.success) {
 console.log(`Email stored successfully with ID: ${result.emailId}`);

 // In your IMAP client code, mark the email as seen on the server
 // After successful IMAP update, mark it as seen in the database
 const seenResult = markEmailAsSeen(emailData.uid);

 if (seenResult.success) {
 console.log("Email marked as seen in database");
 }
 } else {
 console.error("Failed to store email:", result.error);
 }
 */
