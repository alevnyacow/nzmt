#!/usr/bin/env node
import fs from "fs";
import path from "path";

var args = process.argv.slice(2);

var [command, entityName, options = ''] = args;

function getImportName(str) {
  const match = str.match(/import\s*{\s*([^}]+)\s*}/);
  return match ? match[1].trim() : null;
}

function camelizeVariants(str) {
    if (!str.includes('-')) {
        return [str, str.substring(0, 1).toUpperCase() + str.substring(1)]
    }

  const words = str.split("-");

  const lowerCamel = words
    .map((word, index) => 
      index === 0 ? word.toLowerCase() : word[0].toUpperCase() + word.slice(1).toLowerCase()
    )
    .join("");

  const upperCamel = words
    .map(word => word[0].toUpperCase() + word.slice(1).toLowerCase())
    .join("");

  return [lowerCamel, upperCamel];
}

function findProjectRoot(startDir = process.cwd()) {
  let dir = startDir;
  while (dir !== path.parse(dir).root) {
    if (fs.existsSync(path.join(dir, "package.json"))) {
      return dir;
    }
    dir = path.dirname(dir);
  }
  return null;
}

function loadConfig() {
  const projectRoot = findProjectRoot();
  if (!projectRoot) {
    return null;
  }

  const configPath = path.join(projectRoot, "nzmt.config.json");

  if (!fs.existsSync(configPath)) {
    return null;
  }

  try {
    const rawData = fs.readFileSync(configPath, "utf-8");
    const config = JSON.parse(rawData);
    return config;
  } catch (err) {
    throw err;
  }
}

const config = loadConfig();

function createDefaultConfig() {
    if (!config) {
        const projectRoot = findProjectRoot()
        if (!projectRoot) {
            throw 'No package.json was found'
        }

        fs.writeFileSync(path.resolve(projectRoot, 'nzmt.config.json'), JSON.stringify({
            paths: {
                stores: './src/backend/stores',
                services: './src/backend/services',
                providers: './src/backend/providers',
                controllers: './src/backend/controllers',
                entities: './src/shared/entities',
                queries: './src/client/shared/queries',
                di: './src/backend/dependency-injection'
            },
            dependencyInjection: {
                inversifyjs: {
                    storeTokensImport: "import { DIStores } from '@/backend/di'"
                }
            },
            store: {
                prisma: {
                    import: [
                        "import { prisma } from '@/backend/infrastructure/prisma'",
                        "import type { Prisma } from '@/backend/generated-prisma/client'",
                    ]
                },
            }
        }, null, '\t'))
    }

}

if (command === 'init') {
    createDefaultConfig()
    process.exit(0)
}

function generateStores(lowerCase, upperCase) {
    const folder = config?.paths?.stores ? path.resolve(process.cwd(), config?.paths?.stores, entityName) : path.resolve(process.cwd(), entityName);

    fs.mkdirSync(folder, { recursive: true })

    // Contract

    fs.writeFileSync(path.resolve(folder, `${entityName}.store.ts`), [
        "import type { Store } from '@alevnyacow/nzmt'",
        config?.paths?.entities ? `import { ${upperCase} } from '${config?.paths?.entities.replace('./src', '@')}/${entityName}'` : undefined,
        "",
        `export const ${lowerCase}StoreMetadata = {`,
        "\tmodels: {",
        config?.paths?.entities ? `\t\tlist: ${upperCase}.schema,` : "\t\tlist: z.object({ }),",
        config?.paths?.entities ? `\t\tdetails: ${upperCase}.schema,` : "\t\tdetails: z.object({ }),",
        "\t},",
        "",
        "\tsearchPayload: {",
        config?.paths?.entities ? `\t\tlist: ${upperCase}.schema.omit({ id: true }),` : "\t\tlist: z.object({ }),",
        config?.paths?.entities ? `\t\tspecific: ${upperCase}.schema.pick({ id: true }),` : "\t\tspecific: z.object({ }),",
        "\t},",
        "",
        "\tactionsPayload: {",
        config?.paths?.entities ? `\t\tcreate: ${upperCase}.schema.omit({ id: true }),` : "\t\tcreate: z.object({ }),",
        config?.paths?.entities ? `\t\tupdate: ${upperCase}.schema.omit({ id: true }).partial(),` : "\t\tupdate: z.object({ }),",
        "\t},",
        "",
        `\tname: '${upperCase}Store'`,
        "} satisfies Store.Metadata",
        "",
        `export type ${upperCase}Store = Store.Contract<typeof ${lowerCase}StoreMetadata>`
    ].filter(x => typeof x === 'string').join('\n'))

    // RAM

    fs.writeFileSync(path.resolve(folder, `${entityName}.store.ram.ts`), [
        config?.dependencyInjection?.inversifyjs ? "import { injectable } from 'inversify'" : undefined,
        "import { Store } from '@alevnyacow/nzmt'",
        `import { type ${upperCase}Store, ${lowerCase}StoreMetadata } from './${entityName}.store'`,
        "",
        `const CRUDInRAM = Store.InRAM(${lowerCase}StoreMetadata)`,
        "",
        config?.dependencyInjection?.inversifyjs ? "@injectable()" : undefined,
        `export class ${upperCase}RAMStore extends CRUDInRAM implements ${upperCase}Store {`,
        "\t",
        "}"
    ].filter(x => typeof x === 'string').join('\n'))

    // Prisma

    fs.writeFileSync(path.resolve(folder, `${entityName}.store.prisma.ts`), [
        ...config?.store?.prisma?.import ?? [],
        config?.dependencyInjection?.inversifyjs ? "import { injectable } from 'inversify'" : undefined,
        "import { Store } from '@alevnyacow/nzmt'",
        `import { type ${upperCase}Store, ${lowerCase}StoreMetadata } from './${entityName}.store'`,
        "",
        `type Types = Store.Types<${upperCase}Store>`,
        "",
        "const mappers = {",
        `\ttoFindOnePayload: (source: Types['findOnePayload']): Prisma.${upperCase}WhereUniqueInput => {`,
        "\t\treturn {",
        "\t\t\t",
        "\t\t};",
        "\t},",
        `\ttoFindListPayload: (source: Types['findListPayload']): Prisma.${upperCase}WhereInput => {`,
        "\t\treturn {",
        "\t\t\t",
        "\t\t};",
        "\t},",
        `\ttoListModel: (source: Prisma.${upperCase}GetPayload<{}>): Types['listModel'] => {`,
        "\t\treturn {",
        "\t\t\t",
        "\t\t};",
        "\t},",
        `\ttoDetails: (source: Prisma.${upperCase}GetPayload<{ include: { } }>): Types['details'] => {`,
        "\t\treturn {",
        "\t\t\t",
        "\t\t};",
        "\t},",
        `\ttoCreatePayload: (source: Types['createPayload']): Prisma.${upperCase}CreateInput => {`,
        "\t\treturn {",
        "\t\t\t",
        "\t\t};",
        "\t},",
        `\ttoUpdatePayload: (source: Types['updatePayload']): Prisma.${upperCase}UpdateInput => {`,
        "\t\treturn {",
        "\t\t\t",
        "\t\t};",
        "\t}",
        "}",
        "",
        config?.dependencyInjection?.inversifyjs ? "@injectable()" : undefined,
        `export class ${upperCase}PrismaStore implements ${upperCase}Store {`,
        `\tprivate method = Store.methods(${lowerCase}StoreMetadata);`,
        "",
        "\tlist = this.method('list', async ({ filter, pagination: { pageSize, zeroBasedIndex } = { pageSize: 1000, zeroBasedIndex: 0 }}) => {",
        `\t\tconst list = await prisma.${lowerCase}.findMany({`,
        "\t\t\twhere: mappers.toFindListPayload(filter),",
        "\t\t\tskip: zeroBasedIndex * pageSize,",
        "\t\t\ttake: pageSize",
        "\t\t})",
        "\t\t",
        "\t\treturn list.map(mappers.toListModel)",
        "\t});",
        "",
        "\tdetails = this.method('details', async ({ filter }) => {",
        `\t\tconst details = await prisma.${lowerCase}.findUnique({`,
        "\t\t\twhere: mappers.toFindOnePayload(filter),",
        "\t\t\tinclude: {}",
        "\t\t})",
        "",
        "\t\tif (!details) {",
        "\t\t\treturn null",
        "\t\t}",
        "",
        "\t\treturn mappers.toDetails(details)",
        "\t});",
        "",
        "\tcreate = this.method('create', async ({ payload }) => {",
        `\t\tconst { id } = await prisma.${lowerCase}.create({`,
        "\t\t\tdata: mappers.toCreatePayload(payload),",
        "\t\t\tselect: { id: true }",
        "\t\t})",
        "",
        "\t\treturn { id }",
        "\t});",
        "",
        "\tupdateOne = this.method('updateOne', async ({ filter, payload }) => {",
        "\t\ttry {",
        `\t\t\tawait prisma.${lowerCase}.update({`,
        "\t\t\t\twhere: mappers.toFindOnePayload(filter),",
        "\t\t\t\tdata: mappers.toUpdatePayload(payload),",
        "\t\t\t})",
        "",
        "\t\t\treturn { success: true }",
        "\t\t}",
        "\t\tcatch {",
        "\t\t\treturn { success: false }",
        "\t\t}",
        "\t});",
        "",
        "\tdeleteOne = this.method('deleteOne', async ({ filter }) => {",
        "\t\ttry {",
        `\t\t\tawait prisma.${lowerCase}.delete({`,
        "\t\t\t\twhere: mappers.toFindOnePayload(filter),",
        "\t\t\t})",
        "",
        "\t\t\treturn { success: true }",
        "\t\t}",
        "\t\tcatch {",
        "\t\t\treturn { success: false }",
        "\t\t}",
        "\t});",
        "};"
    ].filter(x => typeof x === 'string').join('\n'))

    // barrel

    fs.writeFileSync(path.resolve(folder, 'index.ts'), [
        `export * from './${entityName}.store.ts'`,
        `export * from './${entityName}.store.prisma.ts'`,
        `export * from './${entityName}.store.ram.ts'`
    ].join('\n'))
}

if (command === 'store') {
    var [lowerCase, upperCase] = camelizeVariants(entityName)
    generateStores(lowerCase, upperCase)
    process.exit(0);
}

function generateEntity(upperCase) {
    const folder = config?.paths?.entities ? path.resolve(process.cwd(), config?.paths?.entities, entityName) : path.resolve(process.cwd(), entityName);

    fs.mkdirSync(folder, { recursive: true })

    const body = [
        "import z from 'zod'",
        "import { Entities } from '@alevnyacow/nzmt'",
        "",
        `export type ${upperCase}Model = z.infer<typeof ${upperCase}.schema>`,
        "",
        `export class ${upperCase} {`,
        "\tstatic schema = z.object({",
        "\t\tid: Entities.Identifier.schema,",
        "\t\t",
        "\t})",
        "\t",
        `\tprivate constructor(private readonly data: ${upperCase}Model) {}`,
        "\t",
        `\tstatic create = (data: ${upperCase}Model) => {`,
        `\t\tconst parsedModel = ${upperCase}.schema.parse(data)`,
        `\t\treturn new ${upperCase}(parsedModel)`,
        "\t}",
        "\t",
        `\tget model(): ${upperCase}Model {`,
        "\t\treturn this.data",
        "\t}",
        "}"
    ].join('\n')

    fs.writeFileSync(path.resolve(folder, `${entityName}.entity.ts`), body)
    fs.writeFileSync(path.resolve(folder, 'index.ts'), `export * from './${entityName}.entity'`)
}

if (command === 'entity') {
    var [lowerCase, upperCase] = camelizeVariants(entityName)
    generateEntity(upperCase)
    process.exit(0)
}

function generateService(lowerCase, upperCase, withCrud) {

    const serviceName = withCrud ? entityName + 's' : entityName 
    const folder = config?.paths?.services ? path.resolve(process.cwd(), config?.paths?.services, serviceName) : path.resolve(process.cwd(), serviceName);

    fs.mkdirSync(folder, { recursive: true })

    // Metadata
    const [lowerCaseService, upperCaseService] = camelizeVariants(serviceName) 

    if (withCrud) {
        fs.writeFileSync(path.resolve(folder, `${serviceName}.service.metadata.ts`), [
            "import { type Module, Entities } from '@alevnyacow/nzmt'",
            "import z from 'zod'",
            `import { ${lowerCase}StoreMetadata } from '${config?.paths?.stores?.replace('./src', '@')}/${entityName}'`,
            "",
            `export const ${lowerCaseService}ServiceMetadata = {`,
            `\tname: '${upperCase}sService',`,
            "\tschemas: {",
            "\t\tgetSpecific: {",
            `\t\t\tpayload: z.object({`,
            `\t\t\t\tfilter: ${lowerCase}StoreMetadata.searchPayload.specific`,
            `\t\t\t}),`,
            `\t\t\tresponse: z.object({`,
            `\t\t\t\titem: ${lowerCase}StoreMetadata.models.details.nullable()`,
            `\t\t\t})`,
            `\t\t},`,
            `\t\tgetList: {`,
            `\t\t\tpayload: z.object({`,
            `\t\t\t\tfilter: ${lowerCase}StoreMetadata.searchPayload.list,`,
            `\t\t\t\tpagination: Entities.Pagination.schema.optional()`,
            `\t\t\t}),`,
            `\t\t\tresponse: z.object({`,
            `\t\t\t\titems: z.array(${lowerCase}StoreMetadata.models.list)`,
            `\t\t\t})`,
            `\t\t},`,
            `\t\tupdateOne: {`,
            `\t\t\tpayload: z.object({`,
            `\t\t\t\tfilter: ${lowerCase}StoreMetadata.searchPayload.specific,`,
            `\t\t\t\tpayload: ${lowerCase}StoreMetadata.actionsPayload.update`,
            `\t\t\t}),`,
            `\t\t\tresponse: z.object({})`,
            `\t\t},`,
            `\t\tcreate: {`,
            `\t\t\tpayload: z.object({`,
            `\t\t\t\tpayload: ${lowerCase}StoreMetadata.actionsPayload.create`,
            `\t\t\t}),`,
            `\t\t\tresponse: z.object({`,
            `\t\t\t\tid: Entities.Identifier.schema`,
            `\t\t\t}),`,
            `\t\t},`,
            `\t\tdeleteOne: {`,
            `\t\t\tpayload: z.object({`,
            `\t\t\t\tfilter: ${lowerCase}StoreMetadata.searchPayload.specific`,
            `\t\t\t}),`,
            `\t\t\tresponse: z.object({})`,
            `\t\t},`,
            "\t}",
            "} satisfies Module.Metadata",
            "",
            `export type ${upperCaseService}ServiceDTOs = Module.DTOs<typeof ${lowerCaseService}ServiceMetadata>`
        ].filter(x => typeof x === 'string').join('\n'))
    } else {
        fs.writeFileSync(path.resolve(folder, `${serviceName}.service.metadata.ts`), [
            "import type { Module } from '@alevnyacow/nzmt'",
            "",
            `export const ${lowerCase}ServiceMetadata = {`,
            `\tname: '${upperCase}Service',`,
            "\tschemas: {}",
            "} satisfies Module.Metadata",
            "",
            `export type ${upperCase}ServiceDTOs = Module.DTOs<typeof ${lowerCase}ServiceMetadata>"`
        ].filter(x => typeof x === 'string').join('\n'))
    }

    // Service body

    if (withCrud) {
        fs.writeFileSync(path.resolve(folder, `${serviceName}.service.ts`), [
            config?.dependencyInjection?.inversifyjs ? "import { injectable, inject } from 'inversify'" : undefined,
            config?.dependencyInjection?.inversifyjs?.storeTokensImport ?? undefined,
            `import type { ${upperCase}Store } from '${config?.paths?.stores?.replace('./src', '@')}/${entityName}'`,
            `import { ${lowerCaseService}ServiceMetadata } from './${serviceName}.service.metadata'`,
            "import { Module } from '@alevnyacow/nzmt'",
            config?.dependencyInjection?.inversifyjs ? "@injectable()" : undefined,
            `export class ${upperCaseService}Service {`,
            `\tconstructor(`,
            config?.dependencyInjection?.inversifyjs?.storeTokensImport ? `\t\t@inject(${getImportName(config?.dependencyInjection?.inversifyjs?.storeTokensImport)}.${lowerCase}s)` : undefined,
            `\t\tprivate readonly ${lowerCase}s: ${upperCase}Store`,
            '\t) { }',
            '\t',
            `\tprivate method = Module.methods(${lowerCaseService}ServiceMetadata)`,
            '\t',
            `\tcreate = this.method('create', this.${lowerCase}s.create);`,
            '\t',
            `\tgetSpecific = this.method('getSpecific', async (x) => {`,
            `\t\tconst item = await this.${lowerCase}s.details(x);`,
            `\t\treturn { item };`,
            `\t})`,
            `\t`,
            `\tgetList = this.method('getList', async (x) => {`,
            `\t\tconst items = await this.${lowerCase}s.list(x);`,
            `\t\treturn { items };`,
            `\t})`,
            `\t`,
            `\tupdateOne = this.method('updateOne', async (x) => {`,
            `\t\tawait this.${lowerCase}s.updateOne(x);`,
            `\t\treturn {};`,
            `\t})`,
            `\t`,
            `\tdeleteOne = this.method('deleteOne', async (x) => {`,
            `\t\tawait this.${lowerCase}s.deleteOne(x);`,
            `\t\treturn {};`,
            `\t})`,
            "}"
        ].filter(x => typeof x === 'string').join('\n'))
    } else {
        fs.writeFileSync(path.resolve(folder, `${serviceName}.service.ts`), [
            config?.dependencyInjection?.inversifyjs ? "import { injectable } from 'inversify'" : undefined,
            `import { ${lowerCase}ServiceMetadata } from './${entityName}.service.metadata'`,
            "import { Module } from '@alevnyacow/nzmt'",
            "",
            config?.dependencyInjection === 'inversifyjs' ? "@injectable()" : undefined,
            `export class ${upperCase}Service {`,
            `\tprivate methods = Module.methods(${lowerCase}ServiceMetadata)`,
            "}"
        ].filter(x => typeof x === 'string').join('\n'))
    }

    // Barrel

    fs.writeFileSync(path.resolve(folder, 'index.ts'), [
        `export * from './${serviceName}.service.metadata'`,
        `export * from './${serviceName}.service'`
    ].join('\n'))
}

if (command === 'service') {
    var [lowerCase, upperCase] = camelizeVariants(entityName)
    generateService(lowerCase, upperCase, false)
    process.exit(0)
}

if (command === 'crud') {
    var [lowerCase, upperCase] = camelizeVariants(entityName)
    generateEntity(upperCase)
    generateStores(lowerCase, upperCase)
    generateService(lowerCase, upperCase, true)
    process.exit(0)
}