import { beforeEach, expect, test } from '@rstest/core';
import z from 'zod';
import { InRAM } from './store.ram.utils';
import type { Contract, Metadata } from './store.zod.utils';

const testStoreMetadata = {
    name: 'TestStore',
    actionsPayload: {
        create: z.object({ name: z.string(), extraField: z.string() }),
        update: z.object({ extraField: z.string() })
    },
    models: {
        details: z.object({
            id: z.string(),
            name: z.string(),
            extraField: z.string()
        }),
        list: z.object({ id: z.string(), name: z.string() })
    },
    searchPayload: {
        list: z.object({}),
        specific: z.object({ id: z.string(), name: z.string() })
    }
} satisfies Metadata;

let store: Contract<typeof testStoreMetadata>;

beforeEach(() => {
    store = new (InRAM(testStoreMetadata))();
});

test('empty by default', async () => {
    const items = await store.list({ filter: {} });
    expect(items.length).toBe(0);
});

test('can find added item by id', async () => {
    const { id } = await store.create({
        payload: { name: 'hello', extraField: 'world' }
    });
    const data = await store.details({ filter: { id, name: 'hello' } });
    expect(data).toBeTruthy();
    expect(data!.name).toBe('hello');
    expect(data!.extraField).toBe('world');
    expect(data!.id).toBe(id);
});

test('search by substring', async () => {
    const { id } = await store.create({
        payload: { name: 'sup', extraField: 'af' }
    });
    const data = await store.details({ filter: { id, name: 'su' } });
    expect(data).toBeTruthy();
    expect(data!.extraField).toBe('af');
});

test('pagination', async () => {
    const randomString = () => Math.random().toString()
    await store.create({
        payload: {
            name: randomString(),
            extraField: randomString()
        }
    });
    await store.create({
        payload: {
            name: randomString(),
            extraField: randomString()
        }
    });
    await store.create({
        payload: {
            name: randomString(),
            extraField: randomString()
        }
    });
    await store.create({
        payload: {
            name: randomString(),
            extraField: randomString()
        }
    });
    const firstPage = await store.list({
        filter: {},
        pagination: { pageSize: 2, zeroBasedIndex: 0 }
    });
    expect(firstPage.length).toBe(2);
    const secondPage = await store.list({
        filter: {},
        pagination: { pageSize: 2, zeroBasedIndex: 1 }
    });
    expect(secondPage.length).toBe(2);
    const thirdPage = await store.list({
        filter: {},
        pagination: { pageSize: 2, zeroBasedIndex: 2 }
    });
    expect(thirdPage.length).toBe(0);
    const secondPageOfThree = await store.list({
        filter: {},
        pagination: { pageSize: 1, zeroBasedIndex: 3 }
    });
    expect(secondPageOfThree.length).toBe(1);
});

test('with initial data', async () => {
    const storeWithInitialData = new (InRAM(testStoreMetadata, {
        initialData: [{ extraField: '', id: '', name: 'asfsaf' }]
    }))();

    const data = await storeWithInitialData.list({ filter: {} });
    expect(data.length).toBe(1);
});
