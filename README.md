<p align="center">
<img src='https://raw.githubusercontent.com/alevnyacow/nzmt/refs/heads/main/logo.svg?sanitize=true'></img>
</p>


<p align="center">
  <a href="https://badge.fury.io/js/@alevnyacow%2Fnzmt" target="_blank"><img src='https://badge.fury.io/js/@alevnyacow%2Fnzmt.svg'></img></a>
  <img src='https://img.shields.io/npm/l/%40alevnyacow%2Fnzmt'></img>
  <img src='https://img.shields.io/bundlephobia/minzip/%40alevnyacow/nzmt'></img>
</p>

Scaffold full-stack modules in Next.js in seconds with **Next Zod Modules Toolkit (NZMT)**. 

Get a DDD-inspired architecture with a contract-first approach out of the box. NZMT also comes with useful infrastructure like DI, logging, unified errors, and endpoint guards. 

Batteries included!


# TL;DR

Initialize NZMT once, run the scaffolder, and tweak a few files to get a production-ready backend usable via Server Actions with ready-to-use React Query hooks.

# Quick start with Prisma

Assuming you have 

- `Next.js` project with a generated `Prisma` client
- some `User` schema in your `Prisma` client
- enabled `experimentalDecorators` and `emitDecoratorMetadata` in `compilerOptions` section of `tsconfig.json`
- configured `@tanstack/react-query`

## Setup

```bash
# install NZMT and peer dependencies
npm i inversify zod reflect-metadata @alevnyacow/nzmt

# initialize NZMT with absolute prisma client path
npx nzmt init prismaClientPath:@/generated/prisma/client
```

Then plug your `Prisma` adapter in scaffolded `/server/infrastructure/prisma/client.ts` file.

## Scaffolding CRUD operations for `User`

```bash
npx nzmt crud-api user
```

This command scaffolds:

- `User` entity
- `UserStore` (with Prisma + RAM implementations)
- `UserService` (ready to be used in Server Actions)
- `UserController` proxying UserService methods
- `API routes` for UserController endpoints
- `React Query hooks` for fetching UserController from client-side

Then tweak a few files:

- `/domain/entities/user/user.entity.ts` → entity schema
- `/server/stores/user/user.store.ts` → store schemas (if default schemas do not fit your needs)
- `/server/stores/user/user.store.prisma.ts` → map `UserStore` contracts to Prisma client contracts

And after only one command and a few tweaks you have ready-to-use React Query hooks & Server Actions backend.

## Using scaffolded React query hooks

```
Schema: Client → React Query → API → Controller → Service → Store → DB
```

```tsx
'use client'

import { UserQueries } from "@/ui/shared/queries/user";

export default function Page() {
  const { mutate: addUser } = UserQueries.usePOST()
  const { data, isFetching } = UserQueries.useGET({ query: {} })

  const addRandomUser = () => {
    addUser({ body: { payload: { name: `${Math.random()}` } } })
  }

  return (
    <div>
      <button onClick={addRandomUser}>
        New random user
      </button>
      
      {isFetching ? 'Loading users...' : JSON.stringify(data)}
    </div>
  );
}

```

## Using scaffolded Service methods as Next server actions

```
Schema: Server Action → Service → Store → DB
```

```tsx
'use server'

import { fromDI } from "@/server/di"
import type { UserService } from "@/server/services/user"

export default async function Page() {
    /**
     * FYI: `fromDI` argument is strongly typed and
     * this type automatically updates after you scaffold
     * anything. Cool, right?
     */ 
    const userService = fromDI<UserService>('UserService')

    const user1 = await userService.getDetails({ 
        filter: { id: 'user-1-id' } 
    })

    return <div>{JSON.stringify(user1)}</div>
}
```

# Scaffolder commands glossary

## Complex scaffolding

| Command | Scaffolding result |
|---------|-------------|
| `npx nzmt crud-api <name>` | CRUD via Server Actions and React Query hooks. |
| `npx nzmt crud-service <name>` | CRUD via Server Actions (no Controllers, API Routes and React Query hooks). |
| `npx nzmt se <name>` | **s**tored **e**ntity: entity + store (contracts linked). |
| `npx nzmt rq` | API **r**outes and React **q**ueries for all of your controllers. This command will also remove endpoints which don't exist anymore with according React query hooks |

## Single module scaffolding

| Command | Scaffolding result |Options|
|---------|-------------|-------|
| `npx nzmt e <name>`  | **e**ntity ||
| `npx nzmt vo <name>` | **v**alue **o**bject ||
| `npx nzmt cs <name>`  | **c**ustom **s**tore (all schemas are `z.object({})`) ||
| `npx nzmt p <name>`  | **p**rovider | `pt:Console` will generate Console provider. Default value is `pt:API` |
| `npx nzmt s <name>`  | **s**ervice |`i:UserStore,Logger` will automatically inject `UserStore` and `Logger`. E.g. `npx nzmt s shop i:UserStore,ProductStore` will create `ShopService` with already injected `UserStore` and `ProductStore`|
| `npx nzmt c <name>`  | **c**ontroller |`i:UserService` will automatically inject `UserService`. `Logger` and `Guards` are injected by default regardless of `i:` option|

Here’s a shorter, simpler version in English:

---

# How to implement your own methods

## Zod schemas (module contracts)

Server method contracts are defined with Zod schemas in files like `user.controller.metadata.ts` or `product.service.metadata.ts`.

They:

- validate data at runtime
- can be reused across layers (no separate DTOs needed)
- automatically infer types (no manual TypeScript work)

Service method description example:

```ts
orderDetails: {
  payload: Order.schema.pick({ name: true, createdDate: true }),
  response: z.object({
    user: User.schema,
    products: z.array(Product.schema.omit({ price: true }))
  })
}
```

## Services

1. **Define method in metadata** (`*.service.metadata.ts`):

```ts
foo: {
  request: z.object({ requestString: z.string() }),
  response: z.object({ responseNumber: z.number() })
}
```

2. **Implement it in service** (`*.service.ts`):

```ts
// 'foo' string is strongly-typed, don't worry
foo = this.methods('foo', async ({ requestString }) => {
  // all input and output types are also infered
  return Number(requestString)
})
```

## Controllers

Same idea, but metadata uses optional `query`, optional `body`, and `response`.

1. **Metadata** (`*.controller.metadata.ts`):

```ts
POST: {
  query: z.object({ id: z.string() }),
  body: z.object({ delta: z.number() }),
  response: z.object({ success: z.boolean() })
}
```

2. **Implementation** (`*.controller.ts`):

```ts
POST = this.endpoints('POST', async ({ id, delta }) => {
  return { success: true }
})
```

`query` + `body` are merged into one object in implementation.

## Usage in Next.js

Controllers can be used directly as API routes:

```ts
// api/user-controller/route.ts
const controller = fromDI<UserController>('UserController')

export const GET = controller.GET
```

And servers can be used directlt as Server Actions:

```tsx
export default async function() {
  const service = fromDI<UserService>('UserService')
  const users = await service.getList({ filter: {} })
  // ...
}
```

# FAQ

## What does DDD-inspired mean?

NZMT puts your business domain first. Entities drive the architecture, so backend and frontend stay consistent, and all layers are generated from your entity contracts and schemas.

## What does contract-first mean?

The behavior of all server modules in NZMT is governed by Zod schemas. Function signatures and entity contracts are derived from these schemas. There is also automatic runtime validation to ensure that all data — function arguments and entity models — conform to their schemas.

## Can I tweak scaffolded files?

Yes — everything is fully editable, including configuration. Think of NZMT as a shadcn-style approach for full-stack: scaffold first, then fully own the code. Moreover, in most of the cases your changes are preserved on subsequent generations. For example, if you modify a generated query and run `npx nzmt rq` later, your edits stay intact.

## Do I really need to understand DI and other fancy concepts to use NZMT?

No. NZMT handles dependency injection (DI) for you using `inversifyjs`. You don’t need to set it up manually.
To get an instance of a service anywhere in your server code, just use:

```tsx
import { fromDI } from '@/server/di'

const userService = fromDI<UserService>('UserService')
```

Here, `fromDI` is strongly typed — your IDE will give autocomplete automatically.

## Why data layer modules are called `Stores` and not `Repositories`?

A “Repository” is a specific design pattern for managing data. NZMT prefers Stores — a simple, flexible abstraction for your data layer that can adapt to your needs regardless of the specific pattern. This approach helps to keep your code simple, and it has been successfully used in other languages, like Go.

## Why not use Nest or tRPC?

`NZMT` combines the best of both worlds in one package while staying in plain Next.js:

- From tRPC — type safety and developer experience
- From NestJS — structured architecture (but more DDD-inspired) with intuitive DI

Plus:

- No framework lock-in
- No magic runtime
- Full control over your code
- No extra client-server layers