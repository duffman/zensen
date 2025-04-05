// Interface for the emails table columns
export interface IEmailRecord {
	id: number;
	uid: string;
	message_id: string | null;
	in_reply_to: string | null;
	references: string | null;
	from_address: string | null;
	to_address: string | null;
	cc: string | null;
	subject: string | null;
	date: string | null;
	body_text: string | null;
	body_html: string | null;
	thread_id: string | null;
	flags: string | null; // JSON stringified array
	seen: number; // 0 or 1 for boolean in SQLite
	created_at: string; // SQLite timestamp string
}

// Interface for the attachments table columns
export interface IAttachmentRecord {
	id: number;
	email_id: number;
	filename: string | null;
	content_type: string | null;
	size: number | null;
	content: Buffer | null;
}
