export type ErrorBaseCreatingPayload = {
    error: unknown;
    code?: string;
    details?: any;
};

export type ErrorBaseModel = {
    name: string;
    message: string;
    code: string;
    timestamp: number;
    details: any | null;
};

export type ModuleErrorModel = ErrorBaseModel & {
    module: string;
    method: string;
    cause: ErrorBaseModel | null;
};

export type ControllerErrorModel = ErrorBaseModel & {
    module: string;
    method: string;
    cause: ModuleErrorModel | ErrorBaseModel | null;
    statusCode: number;
};

export const isControllerError = (error: unknown): error is ControllerErrorModel => {
    if (!error || typeof error !== 'object') {
        return false;
    }
    const argKeys = Object.keys(error);
    const requiredKeys = [
        'name',
        'message',
        'code',
        'module',
        'method',
        'timestamp',
        'statusCode'
    ];

    return requiredKeys.every((x) => argKeys.includes(x));
}

export const isModuleError = (arg: any): arg is ModuleErrorModel => {
    if (typeof arg !== 'object' || !arg) {
        return false;
    }
    const argKeys = Object.keys(arg);
    const requiredKeys = [
        'name',
        'message',
        'code',
        'module',
        'method',
        'timestamp'
    ];
    if (!requiredKeys.every((x) => argKeys.includes(x))) {
        return false;
    }
    return !argKeys.includes('statusCode');
};

const spawnBaseError = ({
    error,
    code,
    details
}: ErrorBaseCreatingPayload): ErrorBaseModel => {
    let err: Error =
        error instanceof Error ? error : new Error('unknown error');

    if (typeof error === 'string' || typeof error === 'number') {
        err = new Error(error?.toString());
    }

    if (typeof error === 'object' && error !== null) {
        if (error instanceof Error) {
            err = error;
        } else {
            const jsonRepresentation = JSON.stringify(error);
            err = new Error(jsonRepresentation);
        }
    }

    return {
        message: err.message,
        name: err.name,
        timestamp: Date.now(),
        code: code || err.name,
        details: details || null
    };
};

const spawnFromUnknownError = (
    error: unknown
): ErrorBaseModel | ModuleErrorModel => {
    const isErrorBase = (arg: any): arg is ErrorBaseModel => {
        if (typeof arg !== 'object' || !arg) {
            return false;
        }
        const argKeys = Object.keys(arg);
        const requiredKeys = ['name', 'message', 'code', 'timestamp'];
        return requiredKeys.every((x) => argKeys.includes(x));
    };

    if (isModuleError(error)) {
        return error as ModuleErrorModel;
    }

    if (isErrorBase(error)) {
        return error as ErrorBaseModel;
    }

    return spawnBaseError({ error });
};

// biome-ignore lint/complexity/noStaticOnlyClass: will be refactored
export class ErrorFactory {
    static forModule = (serviceName: string) => {
        return {
            inMethod: (methodName: string) => {
                return {
                    newError: (
                        payload: ErrorBaseCreatingPayload,
                        cause?: unknown
                    ): ModuleErrorModel => {
                        const errorBase = spawnBaseError(payload);
                        return {
                            ...errorBase,
                            cause: cause
                                ? spawnFromUnknownError(cause)
                                : null,
                            module: serviceName,
                            method: methodName
                        };
                    }
                };
            }
        };
    };

    static forController = (controllerName: string) => {
        return {
            inMethod: (methodName: string) => {
                return {
                    newError: (
                        payload: ErrorBaseCreatingPayload & {
                            statusCode: number;
                        },
                        cause?: unknown
                    ): ControllerErrorModel => {
                        const errorBase = spawnBaseError(payload);
                        const formattedCause = cause
                            ? spawnFromUnknownError(cause)
                            : null;
                        if (!payload.code && formattedCause?.code) {
                            errorBase.code = formattedCause.code;
                        }
                        return {
                            ...errorBase,
                            cause: formattedCause,
                            module: controllerName,
                            method: methodName,
                            statusCode: payload.statusCode
                        };
                    }
                };
            }
        };
    };
}
