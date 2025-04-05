import 'reflect-metadata';

/**
 * Base properties interface that all decorators can accept
 */
export interface IBaseProps {
	name?: string;
	description?: string;
	version?: string;
	tags?: string[];
	metadata?: Record<string, any>;
}

/**
 * Error thrown when decorator type constraints are violated
 */
export class DecoratorTypeError extends Error {
	constructor(decoratorName: string, expectedType: string, actualType: string) {
		super(`${decoratorName} decorator can only be applied to ${expectedType}, but was applied to ${actualType}`);
		this.name = 'DecoratorTypeError';
	}
}

/**
 * Metadata keys used by the decorators
 */
export enum MetadataKeys {
	COMPONENT = 'custom:component',
	CONTROLLER = 'custom:controller',
	SERVER = 'custom:server',
	PROVIDER = 'custom:provider',
	TRANSFORMER = 'custom:transformer',
	BASE_PROPS = 'custom:baseProps',
	DECORATOR_TYPE = 'custom:decoratorType'
}

/**
 * Enum for different types of decorators
 */
export enum DecoratorType {
	COMPONENT = 'component',
	CONTROLLER = 'controller',
	SERVER = 'server',
	PROVIDER = 'provider',
	TRANSFORMER = 'transformer'
}

/**
 * Type for component classes which must have a render method
 */
export interface ComponentClass {
	render(): any;
}

/**
 * Type for controller classes which must have handler methods
 */
export interface ControllerClass {
	handle(...args: any[]): any;
}

/**
 * Type for server classes which must have start/stop methods
 */
export interface ServerClass {
	start(): Promise<void> | void;
	stop(): Promise<void> | void;
}

/**
 * Type for provider classes which must have a provide method
 */
export interface ProviderClass {
	provide(): any;
}

/**
 * Type for transformer classes which must have transform method
 */
export interface TransformerClass {
	transform(input: any): any;
}

/**
 * Component decorator - for UI components
 * @param props Optional base properties
 * @returns Class decorator
 */
export function Component(props?: IBaseProps) {
	return function <T extends new (...args: any[]) => any>(target: T): T {
		const prototype = target.prototype;

		// Verify target has render method
		if (typeof prototype.render !== 'function') {
			throw new DecoratorTypeError('Component', 'class with render() method',
										 `class without render() method`);
		}

		// Set metadata
		Reflect.defineMetadata(MetadataKeys.COMPONENT, true, target);
		Reflect.defineMetadata(MetadataKeys.DECORATOR_TYPE, DecoratorType.COMPONENT, target);

		if (props) {
			Reflect.defineMetadata(MetadataKeys.BASE_PROPS, props, target);
		}

		// Return the constructor
		return target;
	};
}

/**
 * Controller decorator - for API controllers
 * @param props Optional base properties
 * @returns Class decorator
 */
export function Controller(props?: IBaseProps) {
	return function <T extends new (...args: any[]) => any>(target: T): T {
		const prototype = target.prototype;

		// Verify target has handle method
		if (typeof prototype.handle !== 'function') {
			throw new DecoratorTypeError('Controller', 'class with handle() method',
										 `class without handle() method`);
		}

		// Set metadata
		Reflect.defineMetadata(MetadataKeys.CONTROLLER, true, target);
		Reflect.defineMetadata(MetadataKeys.DECORATOR_TYPE, DecoratorType.CONTROLLER, target);

		if (props) {
			Reflect.defineMetadata(MetadataKeys.BASE_PROPS, props, target);
		}

		// Return the constructor
		return target;
	};
}

/**
 * Server decorator - for server instances
 * @param props Optional base properties
 * @returns Class decorator
 */
export function Server(props?: IBaseProps) {
	return function <T extends new (...args: any[]) => any>(target: T): T {
		const prototype = target.prototype;

		// Verify target has start and stop methods
		if (typeof prototype.start !== 'function' || typeof prototype.stop !== 'function') {
			throw new DecoratorTypeError('Server', 'class with start() and stop() methods',
										 `class missing required start() or stop() methods`);
		}

		// Set metadata
		Reflect.defineMetadata(MetadataKeys.SERVER, true, target);
		Reflect.defineMetadata(MetadataKeys.DECORATOR_TYPE, DecoratorType.SERVER, target);

		if (props) {
			Reflect.defineMetadata(MetadataKeys.BASE_PROPS, props, target);
		}

		// Return the constructor
		return target;
	};
}

/**
 * Provider decorator - for dependency providers
 * @param props Optional base properties
 * @returns Class decorator
 */
export function Provider(props?: IBaseProps) {
	return function <T extends new (...args: any[]) => any>(target: T): T {
		const prototype = target.prototype;

		// Verify target has provide method
		if (typeof prototype.provide !== 'function') {
			throw new DecoratorTypeError('Provider', 'class with provide() method',
										 `class without provide() method`);
		}

		// Set metadata
		Reflect.defineMetadata(MetadataKeys.PROVIDER, true, target);
		Reflect.defineMetadata(MetadataKeys.DECORATOR_TYPE, DecoratorType.PROVIDER, target);

		if (props) {
			Reflect.defineMetadata(MetadataKeys.BASE_PROPS, props, target);
		}

		// Return the constructor
		return target;
	};
}

/**
 * Transformer decorator - for data transformers
 * @param props Optional base properties
 * @returns Class decorator
 */
export function Transformer(props?: IBaseProps) {
	return function <T extends new (...args: any[]) => any>(target: T): T {
		const prototype = target.prototype;

		// Verify target has transform method
		if (typeof prototype.transform !== 'function') {
			throw new DecoratorTypeError('Transformer', 'class with transform() method',
										 `class without transform() method`);
		}

		// Set metadata
		Reflect.defineMetadata(MetadataKeys.TRANSFORMER, true, target);
		Reflect.defineMetadata(MetadataKeys.DECORATOR_TYPE, DecoratorType.TRANSFORMER, target);

		if (props) {
			Reflect.defineMetadata(MetadataKeys.BASE_PROPS, props, target);
		}

		// Return the constructor
		return target;
	};
}

/**
 * Utility functions to check decorator types
 */
export const isComponent = (target: any): boolean =>
	Reflect.getMetadata(MetadataKeys.COMPONENT, target) === true;

export const isController = (target: any): boolean =>
	Reflect.getMetadata(MetadataKeys.CONTROLLER, target) === true;

export const isServer = (target: any): boolean =>
	Reflect.getMetadata(MetadataKeys.SERVER, target) === true;

export const isProvider = (target: any): boolean =>
	Reflect.getMetadata(MetadataKeys.PROVIDER, target) === true;

export const isTransformer = (target: any): boolean =>
	Reflect.getMetadata(MetadataKeys.TRANSFORMER, target) === true;

/**
 * Get the decorator type of a class
 */
export function getDecoratorType(target: any): DecoratorType | null {
	return Reflect.getMetadata(MetadataKeys.DECORATOR_TYPE, target) || null;
}

/**
 * Get base properties of a decorated class
 */
export function getBaseProps(target: any): IBaseProps | null {
	return Reflect.getMetadata(MetadataKeys.BASE_PROPS, target) || null;
}

// Example usage:
/*
 @Component({
 name: 'UserProfile',
 description: 'Displays user information',
 tags: ['ui', 'profile']
 })
 class UserProfileComponent {
 render() {
 return { type: 'div', props: { className: 'user-profile' } };
 }
 }

 @Controller({
 name: 'UserController',
 version: '1.0.0'
 })
 class UserApiController {
 handle(req: any, res: any) {
 return { status: 200, data: { message: 'Hello!' } };
 }
 }

 @Server({
 name: 'HttpServer',
 metadata: { port: 3000 }
 })
 class HttpServer {
 async start() {
 console.log('Server starting...');
 }

 async stop() {
 console.log('Server stopping...');
 }
 }

 @Provider({
 name: 'ConfigProvider'
 })
 class ConfigProvider {
 provide() {
 return { apiKey: 'abc123', endpoint: 'https://api.example.com' };
 }
 }

 @Transformer({
 name: 'UserDataTransformer'
 })
 class UserDataTransformer {
 transform(user: any) {
 return {
 id: user.id,
 displayName: `${user.firstName} ${user.lastName}`,
 joinDate: new Date(user.joinTimestamp)
 };
 }
 }
 */
