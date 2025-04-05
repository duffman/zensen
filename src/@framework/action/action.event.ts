
export interface IAction<T = any> {
	success: boolean;
	data?: T;
}

/**
 * Represents a generic action result that can be used across different operations.
 * @template T The type of data contained in a successful action result.
 * @template E The type of error information contained in a failed action result.
 */
export class Action<T = any, E = Error> {
	/** Whether the action was successful */
	success: boolean;

	/** The result data (only available when success is true) */
	data?: T;

	/** Error information (only available when success is false) */
	error?: E;

	/** Optional message providing additional context about the action result */
	message?: string;

	/** Timestamp when the action was created */
	timestamp: number;

	private constructor(success: boolean, data?: T, error?: E, message?: string) {
		this.success   = success;
		this.data      = data;
		this.error     = error;
		this.message   = message;
		this.timestamp = Date.now();
	}

	/**
	 * Creates a successful action result.
	 * @param data The result data
	 * @param message Optional message providing context
	 * @returns A successful Action instance
	 */
	static success<T>(data?: T, message?: string): Action<T, never> {
		return new Action<T, never>(true, data, undefined, message);
	}

	/**
	 * Creates a failed action result.
	 * @param error The error information
	 * @param message Optional message providing context
	 * @returns A failed Action instance
	 */
	static failure<E = Error>(error?: E, message?: string): Action<never, E> {
		return new Action<never, E>(false, undefined, error, message);
	}

	/**
	 * Checks if this action is successful and contains data.
	 * @returns True if successful and contains non-undefined data
	 */
	hasData(): boolean {
		return this.success && this.data !== undefined;
	}

	/**
	 * Maps the data of a successful action using the provided function.
	 * @param fn Mapping function to transform the data
	 * @returns A new Action with transformed data, or the original failed Action
	 */
	map<U>(fn: (data: T) => U): Action<U, E> {
		if (this.success && this.data !== undefined) {
			return Action.success<U>(fn(this.data), this.message);
		}
		return this as unknown as Action<U, E>;
	}
}
