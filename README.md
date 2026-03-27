<img src='https://raw.githubusercontent.com/alevnyacow/nzmt/refs/heads/main/logo.svg?sanitize=true'></img>

[![npm version](https://badge.fury.io/js/@alevnyacow%2Fnzmt.svg)](https://badge.fury.io/js/@alevnyacow%2Fnzmt)
![NPM License](https://img.shields.io/npm/l/%40alevnyacow%2Fnzmt)
![npm bundle size (scoped)](https://img.shields.io/bundlephobia/minzip/%40alevnyacow/nzmt)

# About

NZMT is a combination of a convenient library for building application modules validated with Zod schemas and a powerful scaffolding tool.

It combines dependency injection, Zod validation and a DDD-inspired architecture,
while removing most of the boilerplate through code generation out of the box.

Batteries included!

## Why NZMT?

- You want to focus on domain logic without full DDD complexity
- You’re tired of rewriting CRUD, data layer logic, DTOs, and validation
- You want to follow best practices without overengineering or repetitive boilerplate
- You want your application to be runtime-safe
- You don't want to waste time on another framework, you want to keep using plain Next.js, but with better structure and speed
- You want a backend that can evolve into a full-stack solution
- You dig cool cartoonish fonts in logos and you don't see it this much nowadays

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
- `UserStore` contract with `RAM` and `Prisma` implementations
- `UserService` with all business methods
- `UserController` with ready-to-use API endpoints
- Fully typed `UserAPI` contract (endpoints + DTOs) for client usage
- API `route handlers` inside your `app` folder

All code is editable - you stay in full control.

5. **Describe entity properties and validation rules using Zod** for the `User` entity in the scaffolded file `/shared/entities/user/user.entity.ts`.

6. **Implement Prisma mappers** in `/server/stores/user/user.store.prisma.ts`.  
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