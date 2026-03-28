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

Example with CRUD API for User entity with react queries (assuming you have a Next.js project with a generated Prisma client, `User` prisma schema, and configured `@tanstack/react-query`).

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

# 3. Initialize NZMT (once)
npx nzmt init prismaClientPath:@/app/generated/prisma/client
# it scaffolded `nzmt.config.json`, infrastructure, client utils, etc.

# 4. Scaffold CRUD API for `User` entity
npx nzmt crud-api user
```

Let's break down what's been scaffolded after `npx nzmt crud-api user` command:

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

All that’s left is to define the entity’s structure and validation in the static field `schema` (Zod). All related types are already derived, so contracts update automatically. Every scaffolded source file is fully editable, so you're in full control - you can add fields, methods, etc..

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
	toListModel: (source: Prisma.UserGetPayload<{}>): Types['listModel'] => {
		return {
			
		};
	},
	toDetails: (source: Prisma.UserGetPayload<{ include: { } }>): Types['details'] => {
		return {
			
		};
	},
	toCreatePayload: (source: Types['createPayload']): Prisma.UserCreateInput => {
		return {
			
		};
	},
	toUpdatePayload: (source: Types['updatePayload']): Prisma.UserUpdateInput => {
		return {
			
		};
	}
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

export const useUserController_GET = (payload: Method['payload']) => {
	return useQuery<Method['response'], Method['error']>({
		queryKey: [endpoint, payload],
		queryFn: () => apiRequest(endpoint, 'GET')(payload)
	})
}
```

- Fully typed and ready for client-side use.
- `apiRequest` handles endpoint, method, and payload conveniently (also scaffolded and editable).

**All code is editable - you stay in full control! 🔨⚙️**

Now you can start building your domain logic — NZMT handles the boilerplate for you. 🪄