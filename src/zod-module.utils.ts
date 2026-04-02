import type z from 'zod';
import type { ZodType } from 'zod';
import {
    type ErrorBaseCreatingPayload,
    isModuleError,
    type ModuleErrorModel,
    spawnModuleError
} from './errors.utils';

type Schemas = Record<
    string,
    {
        payload: ZodType;
        response: ZodType;
    }
>;

export type Metadata = {
    name: string;
    schemas: Schemas;
};

export type DTOs<T extends Metadata> = {
    [K in keyof T['schemas'] as `${Extract<K, string>}Payload`]: z.infer<
        T['schemas'][K]['payload']
    >;
} & {
    [K in keyof T['schemas'] as `${Extract<K, string>}Response`]: z.infer<
        T['schemas'][K]['response']
    >;
};

export type Methods<T extends Metadata> = {
    [K in keyof T['schemas']]: (
        payload: z.infer<T['schemas'][K]['payload']>
    ) => Promise<z.infer<T['schemas'][K]['response']>>;
};

export type Config = {
    onError?: (e: ModuleErrorModel) => Promise<void>;
};

export const methods =
    <T extends Schemas>(
        metadata: { schemas: T; name: string },
        sharedConfig: Config = {}
    ) =>
    <Method extends keyof T>(
        methodName: Method,
        handler: (
            payload: z.infer<T[Method]['payload']>,
            config: {
                methodError: (
                    payload: string | ErrorBaseCreatingPayload,
                    cause?: unknown
                ) => ModuleErrorModel;
            }
        ) => Promise<z.infer<T[Method]['response']>>,
        config: Config = {}
    ) => {
        const { name, schemas } = metadata;
        return async (
            payload: z.infer<T[Method]['payload']>
        ): Promise<z.infer<T[Method]['response']>> => {
            try {
                const parsedPayload = schemas[methodName].payload.parse(
                    payload
                ) as z.infer<T[Method]['payload']>;
                const response = await handler(parsedPayload, {
                    methodError: (payload, cause) =>
                        spawnModuleError(name)
                            .inMethod(methodName as string)
                            .newError(
                                typeof payload === 'string'
                                    ? {
                                          error: payload,
                                          code: payload,
                                          details: parsedPayload
                                      }
                                    : payload,
                                cause
                            )
                });
                const parsedResponse = schemas[methodName].response.parse(
                    response
                ) as z.infer<T[Method]['response']>;
                return parsedResponse;
            } catch (error) {
                if (isModuleError(error)) {
                    if (sharedConfig.onError) {
                        await sharedConfig.onError(error);
                    }
                    if (config.onError) {
                        await config.onError(error);
                    }
                    throw error;
                }

                const serviceErrorGenerator = spawnModuleError(
                    name
                ).inMethod(methodName as string);

                const serviceError = serviceErrorGenerator.newError(
                    {
                        error: 'Caught unhandled module error (see `cause` field for details)'
                    },
                    error
                );
                if (config.onError) {
                    await config.onError(serviceError);
                }

                throw serviceError;
            }
        };
    };