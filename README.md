# Next Zod Modules Toolkit

[![npm version](https://badge.fury.io/js/@alevnyacow%2Fnzmt.svg)](https://badge.fury.io/js/@alevnyacow%2Fnzmt)
![NPM License](https://img.shields.io/npm/l/%40alevnyacow%2Fnzmt)

# About

NZMT is an opinionated toolkit with scaffolding for building structured Next.js applications with DI, Zod validation, and DDD-inspired architecture — without boilerplate overhead.

- 🧩 **End-to-end contracts and implementations** — generated or manually authored — across backend and client–server integration layers.
- 🔐 **Runtime safety** across server layers with Zod out of the box.
- ⚡ **Dependency Injection** powered by Inversify with no setup required.
- 🚀 Comes with **scaffolding system** to generate and organize application structure via CLI.

# Quick start with scaffolding

```bash
# scaffolder initialization with Prisma (must be done once)
npx nzmt init prismaClientPath:@prisma/client

# product entity with title and price fields
npx nzmt entity product f:title-string,price-int.positive

# product store (with Prisma implementation, RAM implementation and DI)
npx nzmt store product

# product service with injected product store
npx nzmt service product i:ProductStore

# shop controller with injected shop service and logger
npx nzmt controller shop i:Logger,ProductService
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

- **Entities** represent domain objects used throughout the application. They contain no Data Layer logic and are not responsible for business use-case logic, but may include pure domain logic, contracts, and invariants (e.g. User, Product).
- **Value Objects** define reusable, strongly-typed invariants for meaningful concepts such as Pagination or Identifier.

# Scaffolding

## Setup

1. Install required dependencies:
```bash
npm i inversify zod
```
These are not peer dependencies, so you can use NZMT with only required features.

2. Initialize scaffolding:
```
npx nzmt init prismaClientPath:@prisma/client
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