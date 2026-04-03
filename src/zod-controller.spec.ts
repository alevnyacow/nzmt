import { beforeEach, expect, test } from '@rstest/core';
import z from 'zod';

import { endpoints } from './zod-controller.utils'
import { NextRequest } from 'next/server';

const testControllerEndpoints = endpoints({
    name: 'TestController',
    schemas: {
        GET: { 
            query: z.object({ id: z.string() }),
            response: z.object({ idFromQuery: z.string() })
        }
    }
})

const GET = testControllerEndpoints('GET', async ({ id }) => {
    return { idFromQuery: id }
})


test('GET test', async () => {
    const data = await GET(new NextRequest('http://localhost:3000?id=hello'))
    const responseBody = await data.json() as { idFromQuery: string }
    expect(responseBody.idFromQuery).toBe('hello')
})

