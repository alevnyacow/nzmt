import { type NextRequest, NextResponse } from 'next/server';
import z, { type ZodType, type ZodObject, type ZodUnion } from 'zod';
import {
    type ControllerErrorModel,
    type ErrorBaseCreatingPayload,
    ErrorFactory,
    isControllerError
} from './errors.utils';

export enum DefaultErrorCodes {
    REQUEST_PARSING = 'ZOD-CONTROLLER___REQUEST-PARSING',
    RESPONSE_PARSING = 'ZOD-CONTROLLER___RESPONSE-PARSING'
}

type SuccessResponse<ResponseZodSchema> = ResponseZodSchema extends undefined
    ? {}
    : z.infer<ResponseZodSchema>;

type ZodAPISchemas = {
    body?: ZodObject | ZodUnion<[ZodObject<any>, ...ZodObject<any>[]]>;
    query?: ZodObject | ZodUnion<[ZodObject<any>, ...ZodObject<any>[]]>;
    response?: ZodType;
};

type ErrorResponse = {
    code: string;
    message?: string;
    details?: any;
};

type EndpointErrorGenerator = (
    payload: string | ErrorBaseCreatingPayload,
    errorStatus?: number,
    cause?: unknown
) => ControllerErrorModel;

export type Guard = (payload: {
    request: NextRequest;
    endpointError: EndpointErrorGenerator;
}) => Promise<undefined | ControllerErrorModel>;

export type OnErrorHandler = (request: {
    error: ControllerErrorModel;
    req: NextRequest;
}) => Promise<void>;

type EndpointLogic<T extends ZodAPISchemas> = {
    handler: (
        payload: (T['query'] extends ZodType ? z.infer<T['query']> : {}) &
            (T['body'] extends ZodType ? z.infer<T['body']> : {}),
        request: {
            request: NextRequest;
            flags: Record<string, boolean>;
            endpointError: EndpointErrorGenerator;
        }
    ) => Promise<
        T['response'] extends ZodType ? z.infer<T['response']> : void
    >;

    guards?: Guard[];

    eventHandlers?: {
        onSuccess?: Array<
            (data: {
                requestPayload: (T['query'] extends ZodType
                    ? z.infer<T['query']>
                    : {}) &
                    (T['body'] extends ZodType ? z.infer<T['body']> : {});
                request: NextRequest;
                result: T['response'] extends ZodType
                    ? z.infer<T['response']>
                    : undefined;
                flags: Record<string, boolean>;
            }) => Promise<void>
        >;

        onError?: Array<OnErrorHandler>;
    };

    customResponseLogic?: {
        onSuccess?: (payload: {
            req: NextRequest;
            response: T['response'] extends undefined
                ? undefined
                : z.infer<T['response']>;
        }) => Promise<NextResponse>;

        onError?: (payload: {
            req: NextRequest;
            error: ControllerErrorModel;
        }) => Promise<NextResponse>;
    };
};

export type SharedConfig = Partial<{
    guards: Guard[];
    onErrorHandlers?: Array<OnErrorHandler>;
}>;

export const endpoints = <T extends Schemas>(
    metadata: {
        schemas: T;
        name: string;
    },
    sharedConfig: SharedConfig = {}
) => {
    const endpointLogic = <Method extends keyof T>(
        method: Method,
        handler: EndpointLogic<T[Method]>['handler'],
        configuration: Omit<EndpointLogic<T[Method]>, 'handler'> = {}
    ) => {
        return async (request: NextRequest) => {
            let requestPayload = {};

            const errorFactory = ErrorFactory.forController(
                metadata.name
            ).inMethod(method as string);

            try {
                const endpointError: EndpointErrorGenerator = (
                    payload,
                    errorStatus,
                    cause
                ) => {
                    if (typeof payload === 'string') {
                        return errorFactory.newError(
                            {
                                statusCode: errorStatus ?? 500,
                                code: payload,
                                error: payload,
                                details: requestPayload
                            },
                            cause
                        );
                    }

                    return errorFactory.newError(
                        { ...payload, statusCode: errorStatus ?? 500 },
                        cause
                    );
                };

                if (sharedConfig.guards) {
                    for (const sharedGuard of sharedConfig.guards) {
                        const error = await sharedGuard({
                            request,
                            endpointError
                        });
                        if (error) {
                            throw error;
                        }
                    }
                }
                if (configuration.guards) {
                    for (const endpointGuard of configuration.guards) {
                        const error = await endpointGuard({
                            request,
                            endpointError
                        });
                        if (error) {
                            throw error;
                        }
                    }
                }

                const endpointSchemas = metadata.schemas[method]!;

                if (!endpointSchemas) {
                    throw errorFactory.newError({
                        error: 'No schemas were found for the endpoint',
                        statusCode: 500
                    });
                }

                if (endpointSchemas.query) {
                    const queryParamsAsObject = Object.fromEntries(
                        request.nextUrl.searchParams.entries()
                    );
                    const queryParamsParsed =
                        endpointSchemas.query.safeParse(queryParamsAsObject);
                    if (!queryParamsParsed.success) {
                        throw errorFactory.newError({
                            error: queryParamsParsed.error.message,
                            statusCode: 400,
                            code: DefaultErrorCodes.REQUEST_PARSING,
                            details: z.treeifyError(queryParamsParsed.error)
                        });
                    }
                    requestPayload = {
                        ...requestPayload,
                        ...queryParamsParsed.data
                    };
                }

                if (endpointSchemas.body) {
                    const body = await request.json();
                    const bodyParsed = endpointSchemas.body.safeParse(body);
                    if (!bodyParsed.success) {
                        throw errorFactory.newError({
                            error: bodyParsed.error.message,
                            statusCode: 400,
                            code: DefaultErrorCodes.REQUEST_PARSING,
                            details: z.treeifyError(bodyParsed.error)
                        });
                    }
                    requestPayload = { ...requestPayload, ...bodyParsed.data };
                }

                const flags: Record<string, boolean> = {};

                const result = await handler(requestPayload as any, {
                    request,
                    flags,
                    endpointError: (payload, errorStatus, cause) => {
                        if (typeof payload === 'string') {
                            return errorFactory.newError(
                                {
                                    statusCode: errorStatus ?? 500,
                                    code: payload,
                                    error: payload,
                                    details: requestPayload
                                },
                                cause
                            );
                        }

                        return errorFactory.newError(
                            { ...payload, statusCode: errorStatus ?? 500 },
                            cause
                        );
                    }
                });

                if (endpointSchemas.response) {
                    const resultParsed =
                        endpointSchemas.response.safeParse(result);
                    if (!resultParsed.success) {
                        throw errorFactory.newError({
                            error: resultParsed.error.message,
                            statusCode: 500,
                            code: DefaultErrorCodes.RESPONSE_PARSING,
                            details: z.treeifyError(resultParsed.error)
                        });
                    }
                    if (configuration.eventHandlers?.onSuccess) {
                        for (const onSuccessHandler of configuration
                            .eventHandlers.onSuccess) {
                            onSuccessHandler({
                                request,
                                result: resultParsed.data as any,
                                requestPayload: requestPayload as any,
                                flags
                            });
                        }
                    }

                    if (configuration.customResponseLogic?.onSuccess) {
                        return await configuration.customResponseLogic.onSuccess(
                            {
                                req: request,
                                // @ts-expect-error that's alright boy, that's alright
                                response: resultParsed.data
                            }
                        );
                    }

                    return NextResponse.json<SuccessResponse<unknown>>(
                        resultParsed.data,
                        { status: 200 }
                    );
                }

                if (configuration.eventHandlers?.onSuccess) {
                    for (const onSuccessHanlder of configuration.eventHandlers
                        .onSuccess) {
                        await onSuccessHanlder({
                            request,
                            result: undefined as any,
                            requestPayload: requestPayload as any,
                            flags
                        });
                    }
                }

                if (configuration.customResponseLogic?.onSuccess) {
                    return await configuration.customResponseLogic.onSuccess({
                        req: request,
                        // @ts-expect-error that's alright boy, that's alright
                        response: {}
                    });
                }

                return NextResponse.json<SuccessResponse<unknown>>(
                    {},
                    { status: 200 }
                );
            } catch (e) {
                let controllerError: ControllerErrorModel =
                    e as ControllerErrorModel;

                if (isControllerError(e)) {
                    controllerError = errorFactory.newError(
                        {
                            error: 'Internal error',
                            statusCode: 500
                        },
                        e
                    );
                }

                if (
                    !controllerError.details ||
                    typeof controllerError.details !== 'object'
                ) {
                    controllerError.details = {};
                }

                if (sharedConfig.onErrorHandlers) {
                    try {
                        for (const sharedOnError of sharedConfig.onErrorHandlers) {
                            await sharedOnError({
                                error: controllerError,
                                req: request
                            });
                        }
                    } catch (errorFromOnErrorHandler) {
                        controllerError = errorFactory.newError(
                            {
                                error: 'onError handler error',
                                statusCode: 500
                            },
                            errorFromOnErrorHandler
                        );
                    }
                }

                if (configuration.eventHandlers?.onError) {
                    try {
                        for (const onErrorHandler of configuration.eventHandlers
                            .onError) {
                            await onErrorHandler({
                                error: controllerError,
                                req: request
                            });
                        }
                    } catch (errorFromOnErrorHandler) {
                        controllerError = errorFactory.newError(
                            {
                                error: 'onError handler error',
                                statusCode: 500
                            },
                            errorFromOnErrorHandler
                        );
                    }
                }

                if (configuration.customResponseLogic?.onError) {
                    return await configuration.customResponseLogic.onError({
                        req: request,
                        error: controllerError
                    });
                }

                return NextResponse.json<ErrorResponse>(
                    {
                        message: controllerError.message,
                        details: controllerError.statusCode
                            .toString()
                            .startsWith('4')
                            ? controllerError.details
                            : null,
                        code: controllerError.code
                    },
                    { status: controllerError.statusCode }
                );
            }
        };
    };

    return endpointLogic;
};

type Schemas = Record<string, ZodAPISchemas>;

type Flatten<T extends Record<string, object>> = {
    [K in keyof T]: T[K];
}[keyof T];

type OnlyObject<T> = T extends object ? T : never;

type SchemaShape = {
    body?: unknown;
    query?: unknown;
    response?: unknown;
};

export type Metadata<T = Schemas> = {
    name: string;
    schemas: T;
};

type NormalizeSchema<T extends SchemaShape> = {
    body: T extends { body: infer B } ? B : undefined;
    query: T extends { query: infer Q } ? Q : undefined;
    response: T extends { response: infer R } ? R : undefined;
};

type RequestPayload<T extends SchemaShape> = Flatten<{
    [K in Exclude<keyof NormalizeSchema<T>, 'response'> as OnlyObject<
        NormalizeSchema<T>[K]
    > extends never
        ? never
        : K]: z.infer<OnlyObject<NormalizeSchema<T>[K]>>;
}>;

type ResponsePayload<T extends SchemaShape> = T extends { response: infer R }
    ? z.infer<R>
    : never;

type ZodAPIPayload<QueryParams, BodyParams> = (QueryParams extends undefined
    ? {}
    : {
          query: z.infer<QueryParams>;
      }) &
    (BodyParams extends undefined
        ? {}
        : {
              body: z.infer<BodyParams>;
          });

type ZodAPIMethod<
    Schemas extends { body: unknown; query: unknown; response: unknown }
> = {
    payload: ZodAPIPayload<Schemas['query'], Schemas['body']>;
    response: SuccessResponse<Schemas['response']>;
    error: ErrorResponse;
};

export type Contract<
    Metadata extends {
        schemas: Record<string, SchemaShape>;
    },
    CustomModels extends Record<string, unknown> | undefined = undefined
> = {
    endpoints: {
        [K in keyof Metadata['schemas']]: ZodAPIMethod<
            NormalizeSchema<Metadata['schemas'][K]>
        >;
    };

    customModels: CustomModels extends undefined ? {} : CustomModels;

    requestDTOs: {
        [K in keyof Metadata['schemas']]: RequestPayload<
            Metadata['schemas'][K]
        >;
    };

    responseDTOs: {
        [K in keyof Metadata['schemas']]: ResponsePayload<
            Metadata['schemas'][K]
        >;
    };
};
