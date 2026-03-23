# NZMT - Next Zod Modules Toolkit

## Structure

- [Module](#module)
    - `methods` function
    - `Metadata` type
    - `DTOs` type
    - `Methods` type
    - `Config` type
- [Controller](#controller)
    - `endpoints` function
    - `DefaultErrorCodes` enum
    - `Guard` type
    - `OnErrorHandler` type
    - `SharedConfig` type
    - `Metadata` type
    - `Contract` type
- [Store](#store)
    - `methods` function
    - `InRAM` class generator
    - `Types` type
    - `Metadata` type
    - `Contract` type

## <a id='module'></a>Module

### methods

Returns zod module method generator. 

1. How to make a method generator:

```ts
import { Module } from '@alevnyacow/nzmt'

const mathServiceMetadata = {
    // Service name, will be used in errors
    name: 'MathService', 
    // Method schemas description
    schemas: {
        // Method `basicOperations`
        basicOperation: {
            // `basicOperations` payload (Zod schema)
            payload: z.object({     
                lhs: z.number(), 
                rhs: z.number(),
                operation: z.enum(['+', '-', '/', '*'])
            }),
            // `basicOperations` response (Zod schema)
            response: z.object({ 
                result: z.number() 
            })
        },
        // ...another methods
    }
/**
 * Use `... satisfies Module.Metadata` instead of 
 * `const mathServiceMetadata: Module.Metadata = ...`
 * for correct TS autocompletion in your IDE when 
 * using `Module.methods`.
 */ 
} satisfies Module.Metadata 

const mathServiceMethods = Module.methods(mathServiceMetadata)
```

2. How to use this generator (example with class, you can use it also without classes):

```ts
export class MathService {
    // created generator
    private methods = mathServiceMethods

    public basicOperation = this.methods(
        // Method name, working TS intellisense
        'basicOperation',
        // handler logic
        async (
            // payload, also with TS intellisense
            { lhs, operation, rhs },
            // errors generator
            { methodError }
        ) => {
            switch(operation) {
                case '*': {
                    // all types are infered from schemas, so
                    // TS intellisense also works with return types 
                    return { result: lhs * rhs }
                }
                case '+': {
                    return { result: lhs + rhs }
                }
                case '-': {
                    return { result: lhs - rhs }
                }
                case '/': {
                    if (rhs === 0) {
                        /**
                         * You can create error with just code. All
                         * metadata like method name, zod module name
                         * or payload will present in this error object.
                         */ 
                        throw methodError('DIVIDED_BY_ZERO')
                    }
                    return { result: lhs / rhs }
                }
            }
        }
    )
}
```

3. How to use zod module:

```ts
const mathService = new MathService();

// types infered from zod schemas, working intellisense
const { result } = mathService.basicOperation({
    lhs: 10,
    rhs: 15,
    operation: '+'
})
```

### Metadata

Desribes module metadata. Metadata is used as an argument in `methods`.

## <a id='controller'></a>Controller

## <a id='store'></a>Store