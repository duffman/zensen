export interface IEmailAddress {
	name?: string;     // Single display name component per address
	email: string;
}

export interface IAttachment {
	id: string;
	filename: string;
	contentType: string;
	size: number;
	contentId?: string;
}

export interface IEmailMessage {
	// Core identifiers
	id: number;
	messageId: string;
	threadId: string;

	// Threading data
	inReplyTo?: string;
	references?: string[];

	// People
	from: IEmailAddress[];
	to: IEmailAddress[];
	cc?: IEmailAddress[];
	bcc?: IEmailAddress[];

	// Content
	subject: string;
	plainTextBody?: string;
	htmlBody?: string;

	// Metadata
	timestamp: Date;
	flags?: string[];

	// Attachments
	attachments?: IAttachment[];

	// Custom headers
	headers?: {[key: string]: string | string[]};

	// For search/analysis
	embedding?: number[] | null;
}
