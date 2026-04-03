import { expect, test } from '@rstest/core';
import z from 'zod';

import { methods } from './zod-module.utils'

const testModuleMethods = methods({
    name: 'TestModule',
    schemas: {
        foo: { 
            payload: z.object({ str: z.string() }),
            response: z.object({ num: z.number() })
        },
        fooNegative: {
            payload: z.object({ str: z.string() }),
            response: z.object({ num: z.number().negative() })
        }
    }
})

const foo = testModuleMethods('foo', async ({ str }) => {
    return { num: Number(str) }
})

const fooNegative = testModuleMethods('fooNegative', async ({ str }) => {
    return { num: Number(str) }
})

test('foo test', async () => {
    const data = await foo({ str: '10' })
    expect(data.num).toBe(10)
})

test('foo negative test', async () => {
    try {
        await fooNegative({ str: '1' })
        throw undefined
    } catch (error: any) {
        expect(error.module).toEqual('TestModule')
        expect(error.method).toEqual('fooNegative')
        expect(error.code).toEqual('ZodError')
    }
})