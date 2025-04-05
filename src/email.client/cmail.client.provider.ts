import Imap from 'imap';
import { simpleParser } from 'mailparser';
import { Observable, Subject, timer, from } from 'rxjs';
import { map, switchMap, retryWhen, delayWhen, takeUntil } from 'rxjs/operators';
import { IIMAPConfig }                                     from "../strawberry.app.ts";
import { ISMTPConfig }                                     from "../strawberry.app.ts";
import { IEmailMessage }                                   from "./cm.mail.types.ts";
import { IMAPConfig }                                      from "../strawberry.app.ts";

export interface IConfig {
	imap: IIMAPConfig;
	smtp: ISMTPConfig;
	pollingInterval: number;
	maxRetryAttempts?: number;
	retryDelay: number;
}

export class Config implements IConfig {
	imap: IIMAPConfig;
	smtp: ISMTPConfig;
	pollingInterval: number;
	maxRetryAttempts: number;
	retryDelay: number;

	constructor() {
		this.imap = new IMAPConfig();
		this.smtp = { host: '', port: 0, secure: false, auth: { user: '', pass: '' } };
		this.pollingInterval =  5000;
		this.maxRetryAttempts = 5;
		this.retryDelay =  2000;
	}
}

type CMailEvent =
	| { eventType: 'error'; data: Error }
	| { eventType: 'mail'; data: IEmailMessage };

// Abstract base class for mail client
abstract class AbstractClient<Settings extends IConfig> {
	private stopSignal = new Subject<void>();
	private eventStream = new Subject<CMailEvent>();

	constructor(protected config: Settings) {
	}

	protected abstract fetchMails(): Promise<CMailEvent[]>;

	connect(): Observable<CMailEvent> {
		const mailObservable = timer(0, this.config.pollingInterval ).pipe(
			switchMap(() => from(this.fetchMails())),
			map(events => events.forEach(event => this.eventStream.next(event))),
			retryWhen(errors =>
						  errors.pipe(
							  delayWhen(() => timer(this.config.retryDelay)),
							  takeUntil(this.stopSignal),
							  map((error, attempt) => {
								  if (attempt >= 10 - 1) {
									  this.eventStream.next({ eventType: 'error', data: error });
									  throw error;
								  }
								  return error;
							  })
						  )
			),
			takeUntil(this.stopSignal)
		);

		mailObservable.subscribe();
		return this.eventStream.asObservable();
	}

	disconnect(): void {
		this.stopSignal.next();
		this.stopSignal.complete();
		this.eventStream.complete();
	}
}
