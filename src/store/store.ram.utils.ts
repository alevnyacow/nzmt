import z from 'zod';
import { Pagination } from '../entities/pagination.entity';
import type { CRUD, Types } from './store.shared-models.utils';
import {
    type Contract,
    type Metadata,
    methods
} from './store.zod.utils';

export const InRAM = <T extends Metadata>(
    schemas: T,
    options?: {
        searchLogic?: {
            list?: (
                entity: Types<Contract<T>>['details'],
                pattern: Types<Contract<T>>['findListPayload']
            ) => boolean;
            specific?: (
                entity: Types<Contract<T>>['details'],
                pattern: Types<Contract<T>>['findOnePayload']
            ) => boolean;
        };
        mappers?: {
            detailToList?: (
                details: Types<Contract<T>>['details']
            ) => Types<Contract<T>>['listModel'];
            createPayloadToDetail?: (
                details: Types<Contract<T>>['createPayload']
            ) => Types<Contract<T>>['details'];
            updatePayloadToDetail?: (
                prevValue: Types<Contract<T>>['details'],
                update: Types<Contract<T>>['updatePayload']
            ) => Types<Contract<T>>['details'];
        };
        initialData?: Array<Types<Contract<T>>['details']>;
    }
) => {
    type StoreContract = CRUD<
        {
            list: Types<Contract<T>>['listModel'];
            detail: Types<Contract<T>>['details'];
        },
        {
            list: Types<Contract<T>>['findListPayload'];
            specific: Types<Contract<T>>['findOnePayload'];
        },
        {
            create: Types<Contract<T>>['createPayload'];
            update: Types<Contract<T>>['updatePayload'];
        }
    >;

    type Store = Contract<T>;

    class RAMStore implements StoreContract {
        public ___data = [] as Array<Types<Store>['details']>;

        public method = methods(schemas);

        public ___listSearchLogic = (
            entity: Types<Store>['details'],
            pattern: Types<Store>['findListPayload']
        ) => {
            const patternKeys = Object.entries(pattern as object)
                .filter(([_, value]) => !!value)
                .map((x) => x[0]);
            const entityAsObject = entity as object;

            return Object.entries(entityAsObject)
                .filter(([key]) => patternKeys.includes(key))
                .every(([key, value]) => {
                    return (
                        value === (pattern as Record<string, any>)[key] ||
                        value
                            ?.toString()
                            ?.includes(
                                (pattern as Record<string, any>)[
                                    key
                                ]?.toString()
                            )
                    );
                });
        };

        public ___specificSearchLogic = (
            entity: Types<Store>['details'],
            pattern: Types<Store>['findOnePayload']
        ) => {
            const patternKeys = Object.entries(pattern as object)
                .filter(([_, value]) => !!value)
                .map((x) => x[0]);
            const entityAsObject = entity as object;

            return Object.entries(entityAsObject)
                .filter(([key]) => patternKeys.includes(key))
                .every(([key, value]) => {
                    return (
                        value === (pattern as Record<string, any>)[key] ||
                        value
                            ?.toString()
                            ?.includes(
                                (pattern as Record<string, any>)[
                                    key
                                ]?.toString()
                            )
                    );
                });
        };

        public ___mapDetailToList = (
            entity: Types<Store>['details']
        ): Types<Store>['listModel'] => {
            return entity as Types<Store>['listModel'];
        };

        public ___mapCreatePayloadToDetail = (
            payload: Types<Store>['createPayload']
        ): Types<Store>['details'] => {
            return {
                ...(payload as object),
                id: Math.random().toString()
            };
        };

        public ___mapUpdatePayloadToDetail = (
            prevValue: Types<Store>['details'],
            rawUpdate: Types<Store>['updatePayload']
        ): Types<Store>['details'] => {
            const update = Object.fromEntries(
                Object.entries(rawUpdate as object).filter(([, value]) => {
                    return value !== undefined;
                })
            );

            return {
                ...(prevValue as object),
                ...(update as object)
            };
        };

        public constructor() {
            if (!options) {
                return;
            }

            if (options.searchLogic) {
                if (options.searchLogic.list) {
                    this.___listSearchLogic = options.searchLogic.list;
                }

                if (options.searchLogic.specific) {
                    this.___specificSearchLogic = options.searchLogic.specific;
                }
            }

            if (options.mappers) {
                if (options.mappers.detailToList) {
                    this.___mapDetailToList = options.mappers.detailToList;
                }
                if (options.mappers.createPayloadToDetail) {
                    this.___mapCreatePayloadToDetail =
                        options.mappers.createPayloadToDetail;
                }
                if (options.mappers.updatePayloadToDetail) {
                    this.___mapUpdatePayloadToDetail =
                        options.mappers.updatePayloadToDetail;
                }
            }

            if (options.initialData) {
                this.___data = [...options.initialData];
            }
        }

        // @ts-expect-error
        list: StoreContract['list'] = this.method(
            'list',
            // @ts-expect-error
            async ({
                // @ts-expect-error
                filter,
                // @ts-expect-error
                pagination = { pageSize: 1000, zeroBasedIndex: 0 }
            }) => {
                schemas.searchPayload.list.parse(filter);
                Pagination.schema.parse(pagination);
                const afterFiltration = this.___data.filter((x) =>
                    this.___listSearchLogic(x, filter)
                );
                const afterPagination = afterFiltration.filter((_, i) => {
                    return (
                        i >= pagination.pageSize * pagination.zeroBasedIndex &&
                        i <
                            (pagination.zeroBasedIndex + 1) *
                                pagination.pageSize
                    );
                });
                const result = afterPagination.map((x) =>
                    this.___mapDetailToList(x)
                );
                z.array(schemas.models.list).parse(result);
                return result;
            }
        );

        // @ts-expect-error
        details: StoreContract['details'] = this.method(
            'details',
            // @ts-expect-error
            async ({ filter }) => {
                const details = this.___data.find((x) =>
                    this.___specificSearchLogic(x, filter)
                );

                if (!details) {
                    return null;
                }

                return details;
            }
        );

        // @ts-expect-error
        create: StoreContract['create'] = this.method(
            'create',
            // @ts-expect-error
            async ({ payload }) => {
                const newItem = this.___mapCreatePayloadToDetail(payload);
                this.___data = this.___data.concat(newItem);
                return { id: (newItem as { id: string }).id };
            }
        );

        // @ts-expect-error
        updateOne: StoreContract['updateOne'] = this.method(
            'updateOne',
            // @ts-expect-error
            async ({ filter, payload }) => {
                const index = this.___data.findIndex((x) =>
                    this.___specificSearchLogic(x, filter)
                );

                this.___data = this.___data.map((x, i) => {
                    if (i !== index) {
                        return x;
                    }

                    return this.___mapUpdatePayloadToDetail(x, payload);
                });

                return { success: index > -1 };
            }
        );

        // @ts-expect-error
        deleteOne: StoreContract['deleteOne'] = this.method(
            'deleteOne',
            // @ts-expect-error
            async ({ filter }) => {
                const index = this.___data.findIndex((x) =>
                    this.___specificSearchLogic(x, filter)
                );

                this.___data = this.___data.filter((_x, i) => i !== index);

                return { success: index > -1 };
            }
        );
    }

    return RAMStore
};


