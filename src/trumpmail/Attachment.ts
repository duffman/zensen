//import { MessageAttachment, MessageAttachmentHeaders } from 'emailjs';
import { existsSync, PathLike } from 'fs';
import { Readable } from 'stream';

export interface IMessageAttachmentHeaders {
	[index: string]: string | undefined;
	'content-type'?: string;
	'content-transfer-encoding'?: BufferEncoding | '7bit' | '8bit';
	'content-disposition'?: string;
}

export interface IMessageAttachment {
	[index: string]:
		| string
		| boolean
		| IMessageAttachment
		| IMessageAttachment[]
		| IMessageAttachmentHeaders
		| Readable
		| PathLike
		| undefined;
	name?: string;
	headers?: IMessageAttachmentHeaders;
	inline?: boolean;
	alternative?: IMessageAttachment | boolean;
	related?: IMessageAttachment[];
	data?: string;
	encoded?: boolean;
	stream?: Readable;
	path?: PathLike;
	type?: string;
	charset?: string;
	method?: string;
}

export class Attachment implements IMessageAttachment {
  [index: string]:
    | string
    | boolean
    | IMessageAttachment
    | IMessageAttachment[]
    | IMessageAttachmentHeaders
    | Readable
    | PathLike
    | undefined;
  stream?: Readable;
  data?: string;
  path?: PathLike;
  name?: string;
  charset: string;
  encoded?: boolean;
  type?: string;

  constructor(
    filename: string,
    content: Readable | PathLike | string,
    mimeType?: string,
    charset = 'utf-8',
    encoded?: boolean,
  ) {
    this.name = filename;
    if (content instanceof Readable) {
      this.stream = content;
    } else if (existsSync(content)) {
      this.path = content;
    } else if (typeof content === 'string') {
      this.data = content;
    }
    this.type = mimeType;
    this.charset = charset;
    this.encoded = encoded;
  }
}
