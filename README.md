<img src='https://raw.githubusercontent.com/alevnyacow/nzmt/refs/heads/main/logo.svg?sanitize=true'></img>

[![npm version](https://badge.fury.io/js/@alevnyacow%2Fnzmt.svg)](https://badge.fury.io/js/@alevnyacow%2Fnzmt)
![NPM License](https://img.shields.io/npm/l/%40alevnyacow%2Fnzmt)
![npm bundle size (scoped)](https://img.shields.io/bundlephobia/minzip/%40alevnyacow/nzmt)

# About

NZMT is a toolkit for building structured Next.js full-stack applications.

It combines dependency injection, Zod validation and a DDD-inspired architecture,
while removing most of the boilerplate through code generation out of the box.

Batteries included!

## Why NZMT?

- You want to focus on domain logic without full DDD complexity
- You’re tired of rewriting CRUD, data layer logic, DTOs, and validation
- You want to follow best practices without overengineering or repetitive boilerplate
- You want your application to be runtime-safe
- You want to move fast without losing predictability
- You want a backend that can evolve into a full-stack solution
- You dig cool cartoonish fonts in logos

You focus on business logic; NZMT handles the infrastructure.

# Quick start with Prisma 

Assuming you have a Next.js project with a generated Prisma client and a `User` Prisma model:

1. Install required peer dependencies and the toolkit itself.
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

4. Now you can scaffold everything you need for `User` entity CRUD API in one CLI command:
```bash
npx nzmt crud-api user
```

This will generate:

- `User` entity
- `UserStore` contract, `UserRAMStore` and `UserPrismaStore` implementations
- `UserService` proxying all `UserStore` methods
- `UserController` proxying all `UserService` methods. 

All code is editable - you stay in full control.

5. **Describe entity properties and validation rules using Zod** for the `User` entity in the scaffolded file `/shared/entities/user/user.entity.ts`.

6. **Implement Prisma mappers** in `/server/stores/user/user.store.prisma.ts`.  
All methods and contracts are already scaffolded; you only need to describe the mappers themselves. RAM store implementation works out of the box.

7. Use generated controller in `app/api/user/route.ts` file via DI.

```ts
import type { UserController } from "@/server/controllers/user"
import { fromDI } from "@/server/di"

// Get a fully typed controller instance from the DI container.
// Key is fully typed too, of course.
const controller = fromDI<UserController>('UserController')
// Use controller method as a route method.
export const GET = controller.GET
```

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

# Scaffolding

## Setup

```
npx nzmt init prismaClientPath:@/app/generated/prisma/client
```
This creates `nzmt.config.json`, sets up DI and testing, and adds base providers. `prismaClientPath:...` parameter is optional and enables Prisma scaffolding.

## Naming conventions

- The entity name is expected to be **in `kebab-case`** (e.g. `awesome-user`, `product`).
- The entity name is expected to be **in singular form** (e.g. `product` instead of `products`).

## Shared layer modules

### Entities

Example: scaffolding a `User` entity with two fields (name and age).

```bash
npx nzmt entity user f:name-string,age-int.positive
```

You can define entity fields using the `f:` flag. The format is `name-type`, where `type` maps to Zod (e.g. `int.positive` → `z.int().positive()`). This is optional — `npx nzmt entity user` will scaffold a `User` entity without additional fields.

Entity scaffolder generates a dedicated folder with a barrel file and an entity implementation. Generated code is fully editable — you stay in control. 

The generated `user.entity.ts` looks like this:

```ts
import z from 'zod'
import { ValueObjects } from '@alevnyacow/nzmt'

export type UserModel = z.infer<typeof User.schema>

export class User {
    static schema = z.object({
        id: ValueObjects.Identifier.schema,
        name: z.string(),
        age: z.int().positive(),
    })
    
    private constructor(private readonly data: UserModel) {}
    
    static create = (data: UserModel) => {
        const parsedModel = User.schema.parse(data)
        return new User(parsedModel)
    }
    
    get model(): UserModel {
        return this.data
    }
}
```

`User` entity, `User.schema` zod schema and `UserModel` type can be used wherever they are needed.

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