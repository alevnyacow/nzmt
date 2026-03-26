<img src='https://raw.githubusercontent.com/alevnyacow/nzmt/refs/heads/main/logo.svg?sanitize=true'></img>

[![npm version](https://badge.fury.io/js/@alevnyacow%2Fnzmt.svg)](https://badge.fury.io/js/@alevnyacow%2Fnzmt)
![NPM License](https://img.shields.io/npm/l/%40alevnyacow%2Fnzmt)
![npm bundle size (scoped)](https://img.shields.io/bundlephobia/minzip/%40alevnyacow/nzmt)

# About

NZMT is a toolkit for building structured Next.js full-stack applications.

It combines dependency injection, Zod validation and a DDD-inspired architecture,
while removing most of the boilerplate through code generation.

- 🧩 Generate entities, stores, services and controllers boilerplate **with simple CLI commands**.
- 🔐 **Runtime safety** across server layers with Zod out of the box.
- ⚡ **Dependency Injection** powered by Inversify with no setup required.

# Quick start with Prisma 

Suppose you have NextJS application with generated Prisma client.

1. Install required peer dependencies and the toolkit itself.
```bash
npm install inversify zod reflect-metadata @alevnyacow/nzmt
```
2. Enable `Experimental decorators` and `Emit Decorator Metadata` options in your `tsconfig.json`.

3. Initialize NZMT. This will set up all required infrastructure and configuration for you:
```bash
npx nzmt init prismaClientPath:@/app/generated/prisma/client
```

4. Scaffold your first entity. Example for a `Product` with `title` and `price`:
```bash
# Field syntax: f:<name>-<zod-rules>
npx nzmt entity product f:title-string,price-int.positive
```
This will generate the entity, its Zod schema and related types.

5. Scaffold server boilerplate
```bash
# product store (with Prisma implementation, RAM implementation and DI)
npx nzmt store product
# product service proxying all product store methods (with DI)
npx nzmt service product p:ProductStore
# shop controller with injected product service and logger (with DI)
npx nzmt controller shop i:Logger,ProductService
```
Now you have scaffolded structure for `ProductStore`, `ProductService` and `ShopController` and all of them are registered in the DI container. You can now implement your logic inside these modules and expose it via controllers.

You can use `fromDI` method anywhere you need an instance of a controller or a service:

```ts
// app/api/shop/route.ts

import type { ShopController } from "@/server/controllers/shop"
import { fromDI } from "@/server/di"

// The key is fully typed, so you get autocomplete
// across all registered DI modules.
const controller = fromDI<ShopController>('ShopController')

// Suppose you have implemented the list_GET method in the controller.
export const GET = controller.list_GET
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