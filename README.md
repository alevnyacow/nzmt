<img src='https://raw.githubusercontent.com/alevnyacow/nzmt/refs/heads/main/logo.svg?sanitize=true'></img>

[![npm version](https://badge.fury.io/js/@alevnyacow%2Fnzmt.svg)](https://badge.fury.io/js/@alevnyacow%2Fnzmt)
![NPM License](https://img.shields.io/npm/l/%40alevnyacow%2Fnzmt)
![npm bundle size (scoped)](https://img.shields.io/bundlephobia/minzip/%40alevnyacow/nzmt)

# About

**Not** a framework. Seriously, we have enough of those. NZMT is just the tools you always wanted in Next.js, plus a scaffolder that spins up server logic and client queries. Full-stack, the Next.js way!

Think: dependency injection + Zod validation + DDD vibes... but without drowning in boilerplate. You write the fun stuff; NZMT handles the boring stuff.

Batteries included.

## Why NZMT?

- Focus on your domain logic without drowning in full-blown DDD.
- Keep using plain Next.js, just faster and cleaner — no extra framework required.
- Watch entities, stores, services, controllers, handlers, and client-side queries appear automatically (and yes, it’s actually fun).

# Quick start (Prisma + client-side queries)

Assuming you have a Next.js project with a generated Prisma client, `User` Prisma model and configured `@tanstack/react-query`:

## Initialization

1. Install required dependencies and NZMT itself:

```bash
npm install inversify zod reflect-metadata @alevnyacow/nzmt
```

2. Enable `Experimental decorators` and `Emit Decorator Metadata` options in your `tsconfig.json`.

```json
{
  "compilerOptions": {
    "experimentalDecorators": true,
    "emitDecoratorMetadata": true
  }
}
```

3. Initialize NZMT (must be done once). This will set up all required infrastructure and configuration for you:

```bash
npx nzmt init prismaClientPath:@/app/generated/prisma/client
```

## Scaffolding

Now you can scaffold everything you need for `User` entity CRUD API in one CLI command:

```bash
npx nzmt crud-api user
```

This will generate:

- `User` entity
- `UserStore` contract with `RAM` and `Prisma` implementations
- `UserService` with all business methods
- `UserController` with ready-to-use API endpoints
- Fully typed `UserAPI` contract (endpoints + DTOs) for client usage
- API `route handlers` inside your `app` folder
- `React queries`. Fully typed and ready to be used in your client-side code!

**All code is editable - you stay in full control!**

- **Describe entity properties and validation rules using Zod** for the `User` entity in the scaffolded file `/shared/entities/user/user.entity.ts`.

- **Implement Prisma mappers** in `/server/stores/user/user.store.prisma.ts`.  
All methods and contracts are already scaffolded; you only need to describe the mappers themselves. RAM store implementation works out of the box.

# Design principles

## Core idea

DDD is powerful, but it truly shines in large-scale systems with large teams. In practice, developers often face a trade-off:
either adopt heavy architectural concepts or build with little to no structure at all. **Mature engineering is about trade-offs. A good tool should help you make them intentionally.**

That’s what this toolkit is designed for. It brings the benefits of DDD without unnecessary complexity that can slow down early development — and adds scaffolding to move even faster. **Automate what’s routine. Stay flexible for what’s complex.**

## Server-side layer

Server-side logic is structured into four core modules: *Stores*, *Services*, *Controllers*, and *Providers*.

- **Stores** encapsulate Data Layer logic with no business rules.
- **Services** define business logic and use-case flows.
- **Controllers** handle API requests and delegate work to services.
- **Providers** manage integrations with external systems (e.g. email, third-party APIs).

## Shared layer

There are also two building blocks shared across server and client: Entities and Value Objects.

- **Entities** represent domain objects used throughout the application. They don’t include data access or business flow logic, but may contain pure domain logic, contracts and invariants (e.g. User, Product).
- **Value Objects** define reusable, strongly-typed invariants for meaningful concepts such as Pagination or Identifier.


# Package API

- Module
    - `methods` function
    - `Metadata` type
    - `DTOs` type
    - `Methods` type
    - `Config` type
- Controller
    - `endpoints` function
    - `DefaultErrorCodes` enum
    - `Guard` type
    - `OnErrorHandler` type
    - `SharedConfig` type
    - `Metadata` type
    - `Contract` type
- Store
    - `methods` function
    - `InRAM` class generator
    - `Types` type
    - `Metadata` type
    - `Contract` type