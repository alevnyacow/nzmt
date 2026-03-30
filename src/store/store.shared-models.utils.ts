import type { PaginationModel } from '../value-objects/pagination.value-object';

export type CRUD<
    Models extends { list: unknown; detail: unknown },
    SearchPayload extends { list: unknown; specific: unknown },
    ActionsPayload extends { create: unknown; update: unknown }
> = {
    list: (data: {
        filter: SearchPayload['list'];
        pagination?: PaginationModel;
    }) => Promise<Models['list'][]>;
    details: (data: {
        filter: SearchPayload['specific'];
    }) => Promise<Models['detail'] | null>;
    create: (data: {
        payload: ActionsPayload['create'];
    }) => Promise<{ id: string }>;
    updateOne: (data: {
        filter: SearchPayload['specific'];
        payload: ActionsPayload['update'];
    }) => Promise<{ success: boolean }>;
    deleteOne: (data: {
        filter: SearchPayload['specific'];
    }) => Promise<{ success: boolean }>;
};

type ExtractCRUDParams<T> = T extends {
    list: (data: {
        filter: infer SList;
        pagination?: any;
    }) => Promise<Array<infer MList>>;
    details: (data: { filter: infer SDetail }) => Promise<infer MDetail>;
    create: (data: { payload: infer ACreate }) => Promise<any>;
    updateOne: (data: { filter: any; payload: infer AUpdate }) => Promise<any>;
    deleteOne: (payload: any) => Promise<any>;
}
    ? {
          Models: { list: NonNullable<MList>; detail: NonNullable<MDetail> };
          SearchPayload: { list: SList; specific: SDetail };
          ActionsPayload: { create: ACreate; update: AUpdate };
      }
    : never;

export type Types<T> = {
    listModel: ExtractCRUDParams<T>['Models']['list'];
    details: ExtractCRUDParams<T>['Models']['detail'];
    findOnePayload: ExtractCRUDParams<T>['SearchPayload']['specific'];
    findListPayload: ExtractCRUDParams<T>['SearchPayload']['list'];
    createPayload: ExtractCRUDParams<T>['ActionsPayload']['create'];
    updatePayload: ExtractCRUDParams<T>['ActionsPayload']['update'];
};
