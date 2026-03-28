import type {
    ZodArray,
    ZodBoolean,
    ZodNullable,
    ZodObject,
    ZodString,
    ZodType
} from 'zod';
import z from 'zod';
import { Pagination } from '../entities/pagination.entity';
import { methods as moduleMethods } from '../zod-module.utils';
import type {
    CRUD,
} from './store.shared-models.utils';

type ZodSchema = ZodType;

type Models<List, Detail> = {
    list: List;
    detail: Detail;
};

type SearchPayload<List, Specific> = {
    list: List;
    specific: Specific;
};

type ActionsPayload<Create, Update> = {
    create: Create;
    update: Update;
};

export type Metadata = {
    name: string;
    models: {
        list: ZodSchema;
        details: ZodSchema;
    };
    searchPayload: {
        list: ZodSchema;
        specific: ZodSchema;
    };
    actionsPayload: {
        create: ZodSchema;
        update: ZodSchema;
    };
    customOperations?: Record<
        string,
        { payload: ZodSchema; response: ZodSchema }
    >;
};

export type Contract<
    Schemas extends {
        models: {
            list: unknown;
            details: unknown;
        };
        searchPayload: {
            list: unknown;
            specific: unknown;
        };
        actionsPayload: {
            create: unknown;
            update: unknown;
        };
        customOperations?: Record<
            string,
            { payload: unknown; response: unknown }
        >;
    }
> = CRUD<
    Models<
        z.infer<Schemas['models']['list']>,
        z.infer<Schemas['models']['details']>
    >,
    SearchPayload<
        z.infer<Schemas['searchPayload']['list']>,
        z.infer<Schemas['searchPayload']['specific']>
    >,
    ActionsPayload<
        z.infer<Schemas['actionsPayload']['create']>,
        z.infer<Schemas['actionsPayload']['update']>
    >
> &
    (Schemas['customOperations'] extends Record<
        string,
        { payload: ZodSchema; response: ZodSchema }
    >
        ? {
              [operation in keyof Schemas['customOperations']]: (
                  payload: z.infer<
                      Schemas['customOperations'][operation]['payload']
                  >
              ) => Promise<
                  z.infer<Schemas['customOperations'][operation]['response']>
              >;
          }
        : {});

export const toModuleMetadata = <
    Schemas extends {
        models: {
            list: unknown;
            details: unknown;
        };
        searchPayload: {
            list: unknown;
            specific: unknown;
        };
        actionsPayload: {
            create: unknown;
            update: unknown;
        };
        customOperations?: Record<
            string,
            { payload: unknown; response: unknown }
        >;
        name: string
    }
>(
    schemas: Schemas,
) => {
    type ZodCRUDStoreSchemas<
        Schemas extends {
            models: {
                list: unknown;
                details: unknown;
            };
            searchPayload: {
                list: unknown;
                specific: unknown;
            };
            actionsPayload: {
                create: unknown;
                update: unknown;
            };
            customOperations?: Record<
                string,
                { payload: unknown; response: unknown }
            >;
        }
    > = CRUD<
        Models<Schemas['models']['list'], Schemas['models']['details']>,
        SearchPayload<
            Schemas['searchPayload']['list'],
            Schemas['searchPayload']['specific']
        >,
        ActionsPayload<
            Schemas['actionsPayload']['create'],
            Schemas['actionsPayload']['update']
        >
    > &
        (Schemas['customOperations'] extends Record<
            string,
            { payload: ZodSchema; response: ZodSchema }
        >
            ? {
                  [operation in keyof Schemas['customOperations']]: {
                      payload: Schemas['customOperations'][operation]['payload'];
                      response: Schemas['customOperations'][operation]['response'];
                  };
              }
            : {});

    type ZodData = ZodCRUDStoreSchemas<Schemas>;

    type CustomOperaions = Exclude<
        keyof ZodData,
        keyof CRUD<any, any, any>
    >;

    return {
        name: schemas.name,
        schemas: {
            ...(schemas.customOperations ?? {}),
            list: {
                payload: z.object({
                    filter: schemas.searchPayload.list,
                    pagination: Pagination.schema.optional()
                }),
                // @ts-expect-error
                response: z.array(schemas.models.list)
            },
            details: {
                payload: z.object({
                    filter: schemas.searchPayload.specific
                }),
                // @ts-expect-error
                response: schemas.models.details.nullable()
            },
            create: {
                payload: z.object({
                    payload: schemas.actionsPayload.create
                }),
                response: z.object({ id: z.string() })
            },
            updateOne: {
                payload: z.object({
                    filter: schemas.searchPayload.specific,
                    payload: schemas.actionsPayload.update
                }),
                response: z.object({ success: z.boolean() })
            },
            deleteOne: {
                payload: z.object({
                    filter: schemas.searchPayload.specific
                }),
                response: z.object({ success: z.boolean() })
            }
        } as unknown as Record<
            CustomOperaions,
            {
                // @ts-expect-error
                payload: ZodData[CustomOperaions]['payload'];
                // @ts-expect-error
                response: ZodData[CustomOperaions]['response'];
            }
        > & {
            list: {
                payload: ZodObject<
                    // @ts-expect-error
                    Parameters<ZodData['list']>[0] & {
                        pagination: ReturnType<
                            typeof Pagination.schema.optional
                        >;
                    }
                >;
                response: ZodArray<
                    // @ts-expect-error
                    Awaited<ReturnType<ZodData['list']>>[number]
                >;
            };
            details: {
                // @ts-expect-error
                payload: ZodObject<Parameters<ZodData['details']>[0]>;
                response: ZodNullable<
                    // @ts-expect-error
                    Schemas['models']['details']
                >;
            };
            create: {
                // @ts-expect-error
                payload: ZodObject<Parameters<ZodData['create']>[0]>;
                response: ZodObject<{ id: ZodString }>;
            };
            updateOne: {
                // @ts-expect-error
                payload: ZodObject<Parameters<ZodData['updateOne']>[0]>;
                response: ZodObject<{ success: ZodBoolean }>;
            };
            deleteOne: {
                // @ts-expect-error
                payload: ZodObject<Parameters<ZodData['deleteOne']>[0]>;
                response: ZodObject<{ success: ZodBoolean }>;
            };
        }
    };
};

export const methods = <T extends Metadata>(
    schemas: T
) => {
    const data = toModuleMetadata(schemas);

    return moduleMethods(data);
};
