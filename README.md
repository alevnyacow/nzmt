<p align="center">
<img src='https://raw.githubusercontent.com/alevnyacow/nzmt/refs/heads/main/logo.svg?sanitize=true'></img>
</p>


<p align="center">
  <a href="https://badge.fury.io/js/@alevnyacow%2Fnzmt" target="_blank"><img src='https://badge.fury.io/js/@alevnyacow%2Fnzmt.svg'></img></a>
  <img src='https://img.shields.io/npm/l/%40alevnyacow%2Fnzmt'></img>
  <img src='https://img.shields.io/bundlephobia/minzip/%40alevnyacow/nzmt'></img>
</p>

Scaffold full-stack modules in Next.js in seconds with **Next Zod Modules Toolkit (NZMT)**.

Get **a DDD-inspired architecture with a contract-first approach** — and Server Actions working out of the box.

**API, services, stores, entities, validation, and React Query hooks — all generated for you.** No framework. No lock-in. Just production-ready Next.js.

# 👀 How it works

- initialize NZMT once
- run the scaffolder (e.g. `npx nzmt crud-api user`)
- tweak a few files
- get ready-to-use React Query hooks and a backend usable via Server Actions

# 🎬 Quick start with Prisma

Assuming you have a Next.js project with a generated Prisma client, and configured `@tanstack/react-query`:

## ⚙️ Setup

### 1. Install

```bash
npm i inversify zod reflect-metadata @alevnyacow/nzmt
```

### 2. Enable decorators in tsconfig.json

```ts
{
  "compilerOptions": {
    "experimentalDecorators": true,
    "emitDecoratorMetadata": true
  }
}
```

### 3. Initialize

```bash
npx nzmt init prismaClientPath:@/generated/prisma/client
```

This command takes absolute path to your Prisma client as input and generates:

- `nzmt.config.json` file
- DI setup
- infrastructure helpers

### 4. Plug Prisma adapter

Edit scaffolded `/server/infrastructure/prisma/client.ts` file

## 🔍 Making full-stack CRUD for `User` entity with React queries and Server Actions

Assuming you have `User` prisma schema.

```bash
npx nzmt crud-api user
```

This command generates:

- `User` entity
- `UserStore` (with Prisma + RAM implementations)
- `UserService` (ready to be used in Server Actions)
- `UserController` proxying UserService methods
- `API routes` for UserController endpoints
- `React Query hooks` for fetching UserController from client-side

Everything is wired automatically via DI — no manual setup needed.

Then tweak a few files:

- `/domain/entities/user/user.entity.ts` → entity schema
- `/server/stores/user/user.store.ts` → store schemas (if default schemas do not fit your needs)
- `/server/stores/user/user.store.prisma.ts` → map `UserStore` contracts to Prisma client contracts

👉 One command + few tweaks → ready-to-use React Query hooks & Server Actions backend.

## ⚛️ Using scaffolded React query hooks

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

## 🔼 Using scaffolded Service methods as Next server actions

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

# ❓ FAQ

## What does DDD-inspired mean?

NZMT puts your business domain first. Entities drive the architecture, so backend and frontend stay consistent, and all layers are generated from your entity contracts and schemas.

## What does contract-first mean?

The behavior of all server modules in NZMT is governed by Zod schemas. Function signatures and entity contracts are derived from these schemas. There is also automatic runtime validation to ensure that all data — function arguments and entity models — conform to their schemas.

## Can I tweak scaffolded files?

Yes — everything is fully editable, including configuration. Think of NZMT as a shadcn-style approach for full-stack: scaffold first, then fully own the code. Moreover, your changes are preserved on subsequent generations. For example, if you modify a generated query and regenerate later, your edits stay intact.

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