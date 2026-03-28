<img src='https://raw.githubusercontent.com/alevnyacow/nzmt/refs/heads/main/logo.svg?sanitize=true'></img>

[![npm version](https://badge.fury.io/js/@alevnyacow%2Fnzmt.svg)](https://badge.fury.io/js/@alevnyacow%2Fnzmt)
![NPM License](https://img.shields.io/npm/l/%40alevnyacow%2Fnzmt)
![npm bundle size (scoped)](https://img.shields.io/bundlephobia/minzip/%40alevnyacow/nzmt)

# What

Next Zod Modules Toolkit. Next.js tools you actually missed + a scaffolder for server logic & client queries. Not a framework. Full-stack, batteries included. ⚡

# Why

- ☕ Keep using plain Next.js — just faster and cleaner. Skip the moment when some “helpful” framework fights you, making you wonder if coding it yourself would’ve been easier.
- 🧙 Focus on your domain logic without drowning in full-blown DDD.
- ✨ DI, Zod validation, project structure & API controllers out of the box.
- 🪄 Services, controllers, client queries, and other programmer stuff appear at the snap of a finger — and yes, it’s fun. (Well, not *literally* at the snap of a finger — that’s just marketing, to be honest. You still need to run one CLI command.)

# Quick start with Prisma

Assuming you have a Next.js project with a generated Prisma client, and configured `@tanstack/react-query`:

## Setup phase

```bash
# 1. Install NZMT and dependencies
npm i inversify zod reflect-metadata @alevnyacow/nzmt

# 2. Enable decorators in tsconfig.json
# {
#   "compilerOptions": {
#     "experimentalDecorators": true,
#     "emitDecoratorMetadata": true
#   }
# }

# 3. Initialize NZMT with the absolute Prisma client path as a parameter
npx nzmt init prismaClientPath:@/generated/prisma/client
```

After NZMT initialization some basic infrastructure and config file were scaffolded. Open scaffolded file `/server/infrastructure/prisma/client.ts`, then import and set up there the necessary Prisma adapter. Now you’re ready to use NZMT! 

## Example 1. CRUD for `User` entity with API route handlers and react queries

Assuming you have `User` prisma schema.

```bash
npx nzmt crud-api user
```

Let's break down what's been scaffolded after this command:

### 1. Scaffolded `UserEntity`

```ts
/** /shared/entities/user/user.entity.ts **/

import z from 'zod'
import { ValueObjects } from '@alevnyacow/nzmt'

export type UserModel = z.infer<typeof User.schema>

export class User {
	static schema = z.object({
		id: ValueObjects.Identifier.schema,
		
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

All that’s left is to define the entity’s structure and validation in the static field `schema` (Zod). All related types are already derived (including ones in client-side queries), so contracts update automatically. **Every scaffolded source file is fully editable**, so you're in full control - you can add fields, methods, etc..

### 2. Scaffolded `UserStore` contract with `RAM` (in-memory) and `Prisma` implementations

We'll cover two of generated files that need your attention. First is a general user store description.

```ts
/** /server/stores/users/user.store.ts **/

import { Store } from '@alevnyacow/nzmt'
import { User } from '@/shared/entities/user'

export const userStoreMetadata = {
	models: {
		list: User.schema,
		details: User.schema,
	},

	searchPayload: {
		list: User.schema.omit({ id: true }),
		specific: User.schema.pick({ id: true }),
	},

	actionsPayload: {
		create: User.schema.omit({ id: true }),
		update: User.schema.omit({ id: true }).partial(),
	},

	name: 'UserStore'
} satisfies Store.Metadata

...scaffolded code
```

Contracts are pretty self-explainatory, but let's break this down anyway.

Models:

- `models.list` - list model, `list` method will return list of those entities
- `models.details` - details model, `details` will return this entity

Search payload:

- `searchPayload.list` - how to filter data in `list` method
- `searchPayload.specific` - how to find one specific entity in `details` method

Actions payload:

- `actionsPayload.create` - what is needed to create a new entity
- `actionsPayload.update` - what is needed to update an entity. Note: only update payload must be here, filters will be used from `searchPayload`

All of these schemas can be modified. They don’t even have to be derived from the entity’s schema, but doing so is strongly recommended for consistency.

Second file is a `Prisma` implementation:

```ts
/** /server/stores/users/user.store.prisma */

...scaffolded code

const mappers = {
	toFindOnePayload: (source: Types['findOnePayload']): Prisma.UserWhereUniqueInput => {
		return {
			
		};
	},
	toFindListPayload: (source: Types['findListPayload']): Prisma.UserWhereInput => {
		return {
			
		};
	},
    ... few other mappers
}

@injectable()
export class UserPrismaStore implements UserStore {
    ..scaffolded code
```

Pretty cool, right? All you need to do is implementing `mappers` and in the vast majority of cases it's enough to have working `Prisma` store. And even more - `RAM` implementation works out of the box! ✨

### 3. Scaffolded `UserService` with all business methods

Works out of the box. ✨

### 4. Scaffolded `UserController` with ready-to-use API endpoints

Works out of the box. ✨

### 5. Scaffolded `Route handlers` in `/app/api`

Works out of the box. ✨

### 6. Scaffolded `React queries` for all controller methods

Also works out of the box! ✨

Let's take a look at `client/shared/queries/user-controller/GET.ts` for example:

```ts
import { useQuery } from '@tanstack/react-query'
import type { UserAPI } from '@/server/controllers/user'
import { apiRequest } from '@/client/shared/utils'

type Method = UserAPI['endpoints']['GET']

const endpoint = '/api/user-controller'

export const useUserAPI_GET = (payload: Method['payload']) => {
	return useQuery<Method['response'], Method['error']>({
		queryKey: [endpoint, payload],
		queryFn: () => apiRequest(endpoint, 'GET')(payload)
	})
}
```

- Fully typed and ready for client-side use.
- `apiRequest` handles endpoint, method, and payload conveniently (also scaffolded and editable).

And once again - **all code is editable - you stay in full control! 🔨⚙️**

Now you can start building your domain logic — NZMT handles the boilerplate for you. 🪄

## Example 2. CRUD for `Product` entity with only server actions

Assuming you have `Product` prisma schema.

```bash
npx nzmt crud-service product
```

Command `crud-service` is a lot like the `crud-api` command, but it stops after generating service. So, you need to:

- describe `Product` entity (`/shared/entities/product/product.entity.ts`)
- tweak the Product store schemas if needed (`/server/stores/product/product.store.ts`)
- write Prisma store mappers (`/server/stores/product/product.store.prisma.ts`) as in previous example. 

`Services` can be used in Server Actions. So, when you make `crud-api`, this generated service can also be used in Server Actions. Using it is very simple, you need `fromDI` function, which was scaffolded when you initialized NMZT. Let's take a look at combined example with two services we've just created:

```tsx
'use server'

import { fromDI } from "@/server/di"
import type { UserService } from "@/server/services/user"
import type { ProductService } from "@/server/services/product"

export default async function() {
    // keys in fromDI function are strongly typed
    const userService = fromDI<UserService>('UserService')
    const productService = fromDI<ProductService>('ProductService')

    const driver8 = await userService.getDetails({ 
        filter: { id: 'driver-8' } 
    })
    const allProducts = await productService.getList({
        filter: { }
    })

    return <div>
        Take a break, {JSON.stringify(driver8)}
        {JSON.stringify(driver8)}, take a break
        
        Also we've got some products: {JSON.stringify(allProducts)}
    </div>
}
```