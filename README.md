<img src='https://raw.githubusercontent.com/alevnyacow/nzmt/refs/heads/main/logo.svg?sanitize=true'></img>

[![npm version](https://badge.fury.io/js/@alevnyacow%2Fnzmt.svg)](https://badge.fury.io/js/@alevnyacow%2Fnzmt)
![NPM License](https://img.shields.io/npm/l/%40alevnyacow%2Fnzmt)
![npm bundle size (scoped)](https://img.shields.io/bundlephobia/minzip/%40alevnyacow/nzmt)

# TL;DR 🕰

You can **scaffold** safe runtime-validated production-ready **server modules easily usable as Server Actions** with DDD-inspired structure **and ready-to-use React Queries in one CLI command**. Fully wired, editable, no boilerplate needed.

# What and Why

Next Zod Modules Toolkit. 

Next.js tools you actually missed + a scaffolder for server logic & client queries. **Not a framework.** Full-stack, batteries included to build features in Next.js without boilerplate. ⚡

- ☕ Keep using plain Next.js — just faster and cleaner.
- 🧙 Focus on your domain logic without drowning in full-blown DDD.
- ✨ DI, handy API controllers and a bunch of other cool things aimed at improving your DX out of the box.
- 🪄 Services, controllers, client queries, and other programmer stuff appear at the snap of a finger.

# Quick start with Prisma

Assuming you have a Next.js project with a generated Prisma client, and configured `@tanstack/react-query`:

## Setup phase

1. Install NZMT with peer dependencies:

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

## Example 1. CRUD for `User` entity with React queries and Server Actions

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

2. Describe your entity in scaffolded `/shared/entities/user/user.entity.ts` (static `schema` field).

3. Tweak `UserStore` schemas if needed in scaffolded `/server/stores/users/user.store.ts`.

4. Describe how your `UserStore` contracts map to your `Prisma` client contracts in scaffolded `server/stores/users/user.store.prisma.ts` (`mappers` object is already there for you with all functions, just implement them).

So, after one CLI command and few tweaks you can use your React query hooks or Server actions. 🪄

### How to use React query hooks

```
Schema: Client → React Query → API → Controller → Service → Store → DB
```

Everything is already scaffolded and grouped in handy namespace for you, just import it and use! Even invalidations are working out of the box (though you can modify scaffolded queries any way you want)! ✨

```tsx
'use client'

import { UserQueries } from "@/client/shared/queries/user";

export default function Home() {
  const { mutate: addUser } = UserQueries.usePOST()
  const { data, isFetching } = UserQueries.useGET({ query: {} })

  const addColinZeal = () => {
    addUser({ body: { payload: { name: 'Colin Zeal' } } })
  }

  return (
    <div>
      <button onClick={addColinZeal}>
        Add Mr. Zeal
      </button>
      
      {isFetching ? 'Loading users...' : JSON.stringify(data)}
    </div>
  );
}

```

### How to use server modules as server actions

```
Schema: Server Action → Service → Store → DB
```

Just get required instances from DI and use methods. That's all. ✨

```tsx
'use server'

import { fromDI } from "@/server/di"
import type { UserService } from "@/server/services/user"

export default async function() {
    /**
     * FYI: `fromDI` argument is strongly typed and
     * this type automatically updates after you scaffold
     * anything. Cool, right?
     */ 
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

## Can I tweak scaffolded files?

Yes — everything is fully editable, including configuration. Think of NZMT as a shadcn-style approach for full-stack: scaffold first, then fully own the code.

If you need to tweak something, NZMT won’t get in your way. Your changes are preserved on subsequent generations. For example, if you modify a generated query and regenerate later, your edits stay intact.

NZMT is designed for a plug-and-play experience — everything works out of the box. At the same time, it’s just a set of helpers to turn Zod schemas into service, store, and controller contracts, with a powerful scaffolder. No magic here — all code is yours to modify.

## Do I really need to understand DI and other fancy concepts to use NZMT?

No. NZMT provides you safe and intuitive facade above `inversifyjs` and automatically registers dependencies. To get an instance you just use `fromDI` function with strongly typed keys in any place of your server code like this:

```tsx
const userService = fromDI<UserService>('UserService')
```

## Why data layer modules are called `Stores` and not `Repositories`?

Good design is impossible without precise terminology. The definition of a "Repository" can vary depending on the terminology used. It’s frustrating when you’ve spent your whole life writing repositories, and then some smart aleck comes along and accuses you of having been writing, say, Data Access Objects all this time! In general, a "Repository" is simply a pattern for working with data. Often, what we really need isn’t a specific pattern, but a properly separated abstraction layer for data handling, which we can then adapt to our needs. That’s exactly why the names of the modules used for the Data Layer in NZMT are kept as abstract as possible, without tying them to any specific data-handling pattern. 

This approach wasn’t invented here; it has already proven successful, for example, in Go.

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

Still you can use whatever you want, God bless you.

`NZMT` sits between `tRPC` and `NestJS`:

- from tRPC — type safety and DX
- from NestJS — structure and layering, but more DDD-inspired

But:
- no framework lock-in
- no magic runtime
- full control over your code
- no new layers of client-server interaction

Just better Next.js.

