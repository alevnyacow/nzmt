<img src='https://raw.githubusercontent.com/alevnyacow/nzmt/refs/heads/main/logo.svg?sanitize=true'></img>

[![npm version](https://badge.fury.io/js/@alevnyacow%2Fnzmt.svg)](https://badge.fury.io/js/@alevnyacow%2Fnzmt)
![NPM License](https://img.shields.io/npm/l/%40alevnyacow%2Fnzmt)
![npm bundle size (scoped)](https://img.shields.io/bundlephobia/minzip/%40alevnyacow/nzmt)

# What

Next Zod Modules Toolkit. Next.js tools you actually missed + a scaffolder for server logic & client queries. **Not a framework.** Full-stack, batteries included. 

Build full-stack features in Next.js without boilerplate. ⚡

# TL;DR

One command:

`npx nzmt crud-api user`

Gives you:

- entity and stores (Prisma and in-memory)
- fully typed API routes
- services (for Server Actions)
- Zod validation
- React Query hooks

All wired together and fully editable. No boilerplate. See `Quick start with Prisma` for a full working example.

# Why

- ☕ Keep using plain Next.js — just faster and cleaner. Skip the moment when some “helpful” framework fights you, making you wonder if coding it yourself would’ve been easier.
- 🧙 Focus on your domain logic without drowning in full-blown DDD.
- ✨ DI, Zod validation, project structure, handy API controllers and Server actions out of the box.
- 🪄 Services, controllers, client queries, and other programmer stuff appear at the snap of a finger — and yes, it’s fun. (Well, not *literally* at the snap of a finger — that’s just marketing, to be honest. You still need to run one CLI command.)

# Quick start with Prisma

Assuming you have a Next.js project with a generated Prisma client, and configured `@tanstack/react-query`:

## Setup phase

1. Install NZMT and dependencies:

```bash
npm i inversify zod reflect-metadata @alevnyacow/nzmt
```

2. Enable decorators in tsconfig.json

```ts
{
  "compilerOptions": {
    "experimentalDecorators": true,
    "emitDecoratorMetadata": true
  }
}
```

3. Initialize NZMT with the absolute Prisma client path as a parameter

```bash
npx nzmt init prismaClientPath:@/generated/prisma/client
```

This command generates:

- `nzmt.config.json` file
- DI infrastructure boilerplate
- Prisma Client instance injected in DI
- Some infrastructure helpers also already injected in DI

4. Import and set up there the necessary Prisma adapter in `/server/infrastructure/prisma/client.ts`

## Example 1. CRUD for `User` entity with API route handlers and Server Actions

Assuming you have `User` prisma schema.

1. Run NZMT scaffolder:

```bash
npx nzmt crud-api user
```

This command generates:

- `UserEntity`
- `UserStore` (with Prisma + RAM implementations)
- `UserService` (ready to be used in Server Actions)
- `UserController` proxying UserService methods
- User `API routes` for UserController endpoints
- `React Query hooks` for fetching UserController from client-side

Everything is wired automatically via DI — no manual setup needed.

2. Describe your entity in `/shared/entities/user/user.entity.ts` (look at static `schema` field)

3. Tweak `UserStore` schemas if needed in `/server/stores/users/user.store.ts`

4. Describe how your `UserStore` contracts map to your `Prisma` client contracts in `server/stores/users/user.store.prisma.ts` (look at `mappers` object)

And after one CLI command and few tweaks you can use your React query hooks or Server actions. 🪄

### How to use React query hooks

```
Mental model: Client → React Query → API → Controller → Service → Store → DB
```

Everything is already scaffolded for you, just import it and use! ✨

```tsx
'use client'

import { useUserAPI_GET } from "@/client/shared/queries/user-controller/GET";
import { useUserAPI_POST } from "@/client/shared/queries/user-controller/POST";

export default function Home() {
  const { mutate: addUser } = useUserAPI_POST()
  const { data, isFetching } = useUserAPI_GET({ query: {} })

  const addGreg = () => {
    addUser({ body: { payload: { name: 'Greg' } } })
  }

  return (
    <div>
      <button onClick={addGreg}>
        Add Greg
      </button>
      
      {isFetching ? 'Loading users...' : JSON.stringify(data)}
    </div>
  );
}

```

### How to use server actions

```
Mental model: Server Action → Service → Store → DB
```

Just get required instances from DI and use methods. That's all. ✨

```tsx
'use server'

import { fromDI } from "@/server/di"
import type { UserService } from "@/server/services/user"

export default async function() {
    const userService = fromDI<UserService>('UserService')

    const driver8 = await userService.getDetails({ 
        filter: { id: 'driver-8' } 
    })

    return <div>
        Take a break, {JSON.stringify(driver8)}
        {JSON.stringify(driver8)}, take a break
    </div>
}
```

# Common questions

## Do I really need to understand DI and other fancy concepts to use NZMT?

No. NZMT provides you safe and intuitive facade above `inversifyjs` and automatically registers dependencies. To get an instance you just use `fromDI` function with strongly typed keys like this:

```tsx
const userService = fromDI<UserService>('UserService')
```

## Can I tweak scaffolded files?

Yes — everything is fully editable, including configuration. You can think of NZMT as shadcn-style approach for server-side logic — scaffold, then fully own the code. 

## Why not just use plain Next.js?

You can.

NZMT removes the repetitive parts:
- validation
- API wiring
- client queries
- service layer
- data layer

So you can focus on your logic while NZMT handles boring tech stuff like folder structure and contracts. 

P.S. In general, you remain within plain Next.js.

## Why not use Nest or tRPC?

Again, you can use whatever you want, God bless you.

`NZMT` sits between `tRPC` and `NestJS`:

- from tRPC — type safety and DX
- from NestJS — structure and layering

But:
- no framework lock-in
- no magic runtime
- full control over your code

Just better Next.js.


