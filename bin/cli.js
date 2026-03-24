#!/usr/bin/env node
import fs from "fs";
import path from "path";

var args = process.argv.slice(2);

var [command, entityName, ...options] = args;

function insertAfterLineInFile(filePath, targetLine, newLine) {
  let content = fs.readFileSync(filePath, 'utf8');

  const lines = content.split('\n');
  const index = lines.findIndex(line => line.includes(targetLine));

  if (index !== -1) {
    lines.splice(index + 1, 0, newLine);
    fs.writeFileSync(filePath, lines.join('\n'), 'utf8');
  }
}

function insertBeforeLineInFile(filePath, targetLine, newLine) {
  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split('\n');

  const index = lines.findIndex(line => line.includes(targetLine));

  if (index !== -1) {
    lines.splice(index, 0, newLine);
    fs.writeFileSync(filePath, lines.join('\n'), 'utf8');
  }
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
                di: './src/server/di',
                stores: './src/server/stores',
                services: './src/server/services',
                providers: './src/server/providers',
                controllers: './src/server/controllers',
                entities: './src/shared/entities',
                valueObjects: './src/shared/value-objects',
                queries: './src/client/shared/queries'
            },
            store: {
                prisma: {
                    import: [
                        "import { prisma } from '@/server/infrastructure/prisma'",
                        "import type { Prisma } from '@/server/generated-prisma/client'",
                    ]
                },
            }
        }, null, '\t'))
    }
}

function initDI() {
    const config = loadConfig()
    const diPath = config?.paths?.di

    const folder = path.resolve(process.cwd(), diPath)
    fs.mkdirSync(folder, { recursive: true })

    // Entries
    fs.writeFileSync(path.resolve(folder, `entries.di.ts`), [
        "import type { BindInWhenOnFluentSyntax } from 'inversify'",
        "",
        "type DIEntries = Record<",
        "\tstring,",
        "\t| { constantValue: object }",
        "\t| (new (...args: any[]) => any)",
        "\t| Record<'test' | 'dev' | 'prod',",
        "\t\t| [new (...args: any[]) => any, (x: BindInWhenOnFluentSyntax<unknown>) => any]",
        "\t\t| (new (...args: any[]) => any)",
        "\t\t| { constantValue: object }",
        "\t>",
        ">",
        "",
        "export const diEntries = {",
        "\t// Stores",
        "\t// Providers",
        "\t// Services",
        "\t// Controllers",
        "\t// Other",
        "} satisfies DIEntries",
        "",
        "export type DITokens = keyof typeof diEntries",
    ].join('\n'))

    // Containers
    fs.writeFileSync(path.resolve(folder, `container.dev.di.ts`), [
        "import { Container } from 'inversify'",
        "import { diEntries } from './entries.di'",
        "",
        "const container = new Container()",
        "",
        "for (const rule in diEntries) {",
        "\tconst ruleContentRaw = diEntries[rule as keyof typeof diEntries]",
        "\tif ('constantValue' in ruleContentRaw) {",
        "\t\tcontainer.bind(rule).toConstantValue(ruleContentRaw.constantValue)",
        "\t\tcontinue",
        "\t}",
        "\tconst ruleContent =",
        "\t\ttypeof ruleContentRaw === 'object'",
        "\t\t\t? ruleContentRaw.dev",
        "\t\t\t: ruleContentRaw",
        "\tif (Array.isArray(ruleContent)) {",
        "\t\tconst [Entry, builder] = ruleContent",
        "\t\tbuilder(container.bind(rule).to(Entry))",
        "\t\tcontinue",
        "\t}",
        "\tif ('constantValue' in ruleContent) {",
        "\t\tcontainer.bind(rule).toConstantValue(ruleContent.constantValue)",
        "\t\tcontinue",
        "\t}",
        "\tcontainer.bind(rule).to(ruleContent)",
        "}",
        "",
        "export { container as devContainer }"
    ].join('\n'))

    fs.writeFileSync(path.resolve(folder, `container.test.di.ts`), [
        "import { Container } from 'inversify'",
        "import { diEntries } from './entries.di'",
        "",
        "const container = new Container()",
        "",
        "for (const rule in diEntries) {",
        "\tconst ruleContentRaw = diEntries[rule as keyof typeof diEntries]",
        "\tif ('constantValue' in ruleContentRaw) {",
        "\t\tcontainer.bind(rule).toConstantValue(ruleContentRaw.constantValue)",
        "\t\tcontinue",
        "\t}",
        "\tconst ruleContent =",
        "\t\ttypeof ruleContentRaw === 'object'",
        "\t\t\t? ruleContentRaw.test",
        "\t\t\t: ruleContentRaw",
        "\tif (Array.isArray(ruleContent)) {",
        "\t\tconst [Entry, builder] = ruleContent",
        "\t\tbuilder(container.bind(rule).to(Entry))",
        "\t\tcontinue",
        "\t}",
        "\tif ('constantValue' in ruleContent) {",
        "\t\tcontainer.bind(rule).toConstantValue(ruleContent.constantValue)",
        "\t\tcontinue",
        "\t}",
        "\tcontainer.bind(rule).to(ruleContent)",
        "}",
        "",
        "export { container as testContainer }"
    ].join('\n'))

    fs.writeFileSync(path.resolve(folder, `container.prod.di.ts`), [
        "import { Container } from 'inversify'",
        "import { diEntries } from './entries.di'",
        "",
        "const container = new Container()",
        "",
        "for (const rule in diEntries) {",
        "\tconst ruleContentRaw = diEntries[rule as keyof typeof diEntries]",
        "\tif ('constantValue' in ruleContentRaw) {",
        "\t\tcontainer.bind(rule).toConstantValue(ruleContentRaw.constantValue)",
        "\t\tcontinue",
        "\t}",
        "\tconst ruleContent =",
        "\t\ttypeof ruleContentRaw === 'object'",
        "\t\t\t? ruleContentRaw.prod",
        "\t\t\t: ruleContentRaw",
        "\tif (Array.isArray(ruleContent)) {",
        "\t\tconst [Entry, builder] = ruleContent",
        "\t\tbuilder(container.bind(rule).to(Entry))",
        "\t\tcontinue",
        "\t}",
        "\tif ('constantValue' in ruleContent) {",
        "\t\tcontainer.bind(rule).toConstantValue(ruleContent.constantValue)",
        "\t\tcontinue",
        "\t}",
        "\tcontainer.bind(rule).to(ruleContent)",
        "}",
        "",
        "export { container as prodContainer }"
    ].join('\n'))

    // Index
    fs.writeFileSync(path.resolve(folder, `index.ts`), [
        "import 'reflect-metadata'",
        "import { devContainer } from './container.dev.di'",
        "import { prodContainer } from './container.prod.di'",
        "import { testContainer } from './container.test.di'",
        "import type { DITokens } from './entries.di'",
        "",
        "const getActiveContainer = () => {",
        "\tconst environment = process.env.NODE_ENV",
        "\tif (environment === 'test') {",
        "\t\treturn testContainer",
        "\t}",
        "\tif (environment === 'development') {",
        "\t\treturn devContainer",
        "\t}",
        "\treturn prodContainer",
        "}",
        "",
        "export const fromDI = <Result>(key: DITokens) => {",
        "\tconst container = getActiveContainer()",
        "\treturn container.get<Result>(key)",
        "}"
    ].join('\n'))
};

if (command.toLowerCase() === 'init' || command === 'i') {
    createDefaultConfig()
    initDI()
    process.exit(0)
}

function generateStores(lowerCase, upperCase, withEntityPreset) {
    const folder = config?.paths?.stores ? path.resolve(process.cwd(), config?.paths?.stores, entityName) : path.resolve(process.cwd(), entityName);

    fs.mkdirSync(folder, { recursive: true })

    const withEntity = withEntityPreset || (options ?? []).includes('with-entity')

    // Contract

    fs.writeFileSync(path.resolve(folder, `${entityName}.store.ts`), [
        "import type { Store } from '@alevnyacow/nzmt'",
        withEntity ? `import { ${upperCase} } from '${config?.paths?.entities.replace('./src', '@')}/${entityName}'` : undefined,
        "",
        `export const ${lowerCase}StoreMetadata = {`,
        "\tmodels: {",
        withEntity ? `\t\tlist: ${upperCase}.schema,` : "\t\tlist: z.object({ }),",
        withEntity ? `\t\tdetails: ${upperCase}.schema,` : "\t\tdetails: z.object({ }),",
        "\t},",
        "",
        "\tsearchPayload: {",
        withEntity ? `\t\tlist: ${upperCase}.schema.omit({ id: true }),` : "\t\tlist: z.object({ }),",
        withEntity ? `\t\tspecific: ${upperCase}.schema.pick({ id: true }),` : "\t\tspecific: z.object({ }),",
        "\t},",
        "",
        "\tactionsPayload: {",
        withEntity ? `\t\tcreate: ${upperCase}.schema.omit({ id: true }),` : "\t\tcreate: z.object({ }),",
        withEntity ? `\t\tupdate: ${upperCase}.schema.omit({ id: true }).partial(),` : "\t\tupdate: z.object({ }),",
        "\t},",
        "",
        `\tname: '${upperCase}Store'`,
        "} satisfies Store.Metadata",
        "",
        `export type ${upperCase}Store = Store.Contract<typeof ${lowerCase}StoreMetadata>`
    ].filter(x => typeof x === 'string').join('\n'))

    // RAM

    fs.writeFileSync(path.resolve(folder, `${entityName}.store.ram.ts`), [
        "import { injectable } from 'inversify'",
        "import { Store } from '@alevnyacow/nzmt'",
        `import { type ${upperCase}Store, ${lowerCase}StoreMetadata } from './${entityName}.store'`,
        "",
        `const CRUDInRAM = Store.InRAM(${lowerCase}StoreMetadata)`,
        "",
        "@injectable()",
        `export class ${upperCase}RAMStore extends CRUDInRAM implements ${upperCase}Store {`,
        "\t",
        "}"
    ].filter(x => typeof x === 'string').join('\n'))

    // Prisma

    fs.writeFileSync(path.resolve(folder, `${entityName}.store.prisma.ts`), [
        ...config?.store?.prisma?.import ?? [],
        "import { injectable } from 'inversify'",
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
        "@injectable()",
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

    // update DI
    
    const diEntriesPath = path.resolve(process.cwd(), config?.paths?.di, 'entries.di.ts')

    insertBeforeLineInFile(
        diEntriesPath,
        'type DIEntries =',
        `import { ${upperCase}PrismaStore, ${upperCase}RAMStore } from '${config?.paths?.stores.replace('./src', '@')}/${entityName}'\n`
    )

    insertAfterLineInFile(
        diEntriesPath,
        '// Stores',
        `\t${upperCase}Store: { test: [${upperCase}RAMStore, (x) => x.inSingletonScope()], prod: ${upperCase}PrismaStore, dev: ${upperCase}PrismaStore },`,
    )

}

if (command.toLowerCase() === 'store' || command === 's') {
    var [lowerCase, upperCase] = camelizeVariants(entityName)
    generateStores(lowerCase, upperCase)
    process.exit(0);
}

function generateEntity(upperCase) {
    const folder = config?.paths?.entities ? path.resolve(process.cwd(), config?.paths?.entities, entityName) : path.resolve(process.cwd(), entityName);
    const fields = options.filter(x => x.startsWith('f:')).flatMap(x => x.split(':')[1]).join(',').split(',').map(x => x.split('-')).filter(x => x.length === 2)

    fs.mkdirSync(folder, { recursive: true })

    const body = [
        "import z from 'zod'",
        "import { ValueObjects } from '@alevnyacow/nzmt'",
        "",
        `export type ${upperCase}Model = z.infer<typeof ${upperCase}.schema>`,
        "",
        `export class ${upperCase} {`,
        "\tstatic schema = z.object({",
        "\t\tid: ValueObjects.Identifier.schema,",
        fields.length ? 
            fields.map(([fieldName, description]) => {
                return `\t\t${fieldName}: z.${description.split('.').join('().')}(),`
            }).join('\n')
        : "\t\t",
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

if (command.toLowerCase() === 'entity' || command === 'e') {
    var [lowerCase, upperCase] = camelizeVariants(entityName)
    generateEntity(upperCase)
    process.exit(0)
}

function generateValueObject(upperCase) {
    const folder = config?.paths?.valueObjects ? path.resolve(process.cwd(), config?.paths?.valueObjects, entityName) : path.resolve(process.cwd(), entityName);
    const fields = options.filter(x => x.startsWith('f:')).flatMap(x => x.split(':')[1]).join(',').split(',').map(x => x.split('-')).filter(x => x.length === 2)

    fs.mkdirSync(folder, { recursive: true })

    const body = [
        "import z from 'zod'",
        "",
        `export type ${upperCase}Model = z.infer<typeof ${upperCase}.schema>`,
        "",
        `export class ${upperCase} {`,
        "\tstatic schema = z.object({",
        fields.length ? 
            fields.map(([fieldName, description]) => {
                return `\t\t${fieldName}: z.${description.split('.').join('().')}(),`
            }).join('\n')
        : "\t\t",
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

    fs.writeFileSync(path.resolve(folder, `${entityName}.value-object.ts`), body)
    fs.writeFileSync(path.resolve(folder, 'index.ts'), `export * from './${entityName}.value-object'`)
}

if (command.toLowerCase() === 'value-object' || command === 'vo') {
    var [lowerCase, upperCase] = camelizeVariants(entityName)
    generateValueObject(upperCase)
    process.exit(0)
}

function generateProvider(lowerCase, upperCase) {
    const folder = config?.paths?.providers ? path.resolve(process.cwd(), config?.paths?.providers, entityName) : path.resolve(process.cwd(), entityName);
    const providerType = options.find(x => x.startsWith('pt:'))?.split(':')?.at(1) ?? 'API'
    
    fs.mkdirSync(folder, { recursive: true })
    
    // Base
    fs.writeFileSync(path.resolve(folder, `${entityName}.provider.ts`), [
        `import { Module } from '@alevnyacow/nzmt'`,
        '',
        `export const ${lowerCase}ProviderMetadata = {`,
        `\tname: '${upperCase}Provider'`,
        `\tschemas: {}`,
        `} satisfies Module.Metadata`,
        ``,
        `type Methods = Module.Methods<typeof ${lowerCase}ProviderMetadata>;`,
        ``,
        `export abstract class ${upperCase}Provider {`,
        `\t`,
        `}`
    ].join('\n'))

    // Mock
    fs.writeFileSync(path.resolve(folder, `${entityName}.provider.mock.ts`), [
        `import { ${upperCase}Provider } from './${entityName}.provider'`,
        '',
        `export class ${upperCase}MockProvider extends ${upperCase}Provider {`,
        `\t`,
        `}`
    ].join('\n'))

    // Provider
    fs.writeFileSync(path.resolve(folder, `${entityName}.provider.${providerType.toLowerCase()}.ts`), [
        `import { ${upperCase}Provider } from './${entityName}.provider'`,
        '',
        `export class ${upperCase}${providerType}Provider extends ${upperCase}Provider {`,
        `\t`,
        `}`
    ].join('\n'))

    // Barrel
    fs.writeFileSync(path.resolve(folder, `index.ts`), [
        `export * from './${entityName}.provider'`,
        `export * from './${entityName}.provider.${providerType.toLowerCase()}'`
    ].join('\n'))

    // Update DI
    const diEntriesPath = path.resolve(process.cwd(), config?.paths?.di, 'entries.di.ts')

    insertBeforeLineInFile(
        diEntriesPath,
        'type DIEntries =',
        `import { ${upperCase}MockProvider, ${upperCase}${providerType}Provider } from '${config?.paths?.providers.replace('./src', '@')}/${entityName}}'\n`
    )

    insertAfterLineInFile(
        diEntriesPath,
        '// Providers',
        `\t${upperCase}Provider: { test: ${upperCase}MockProvider, prod: ${upperCase}${providerType}Provider, dev: ${upperCase}${providerType}Provider },`,
    )
}

if (command.toLowerCase() === 'provider' || command === 'p') {
    var [lowerCase, upperCase] = camelizeVariants(entityName)
    generateProvider(lowerCase, upperCase)
    process.exit(0)
}


function generateService(lowerCase, upperCase, withCrud) {
    const folder = config?.paths?.services ? path.resolve(process.cwd(), config?.paths?.services, entityName) : path.resolve(process.cwd(), entityName);

    fs.mkdirSync(folder, { recursive: true })

    // Metadata
    if (withCrud) {
        fs.writeFileSync(path.resolve(folder, `${entityName}.service.metadata.ts`), [
            "import { type Module, ValueObjects } from '@alevnyacow/nzmt'",
            "import z from 'zod'",
            `import { ${lowerCase}StoreMetadata } from '${config?.paths?.stores?.replace('./src', '@')}/${entityName}'`,
            "",
            `export const ${lowerCase}ServiceMetadata = {`,
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
            `\t\t\t\tpagination: ValueObjects.Pagination.schema.optional()`,
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
            `\t\t\t\tid: ValueObjects.Identifier.schema`,
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
            `export type ${upperCase}ServiceDTOs = Module.DTOs<typeof ${lowerCase}ServiceMetadata>`
        ].filter(x => typeof x === 'string').join('\n'))
    } else {
        fs.writeFileSync(path.resolve(folder, `${entityName}.service.metadata.ts`), [
            "import type { Module } from '@alevnyacow/nzmt'",
            "",
            `export const ${lowerCase}ServiceMetadata = {`,
            `\tname: '${upperCase}Service',`,
            "\tschemas: {}",
            "} satisfies Module.Metadata",
            "",
            `export type ${upperCase}ServiceDTOs = Module.DTOs<typeof ${lowerCase}ServiceMetadata>`
        ].filter(x => typeof x === 'string').join('\n'))
    }

    // Service body

    if (withCrud) {
        fs.writeFileSync(path.resolve(folder, `${entityName}.service.ts`), [
            "import { injectable, inject } from 'inversify'",
            `import { DITokens } from '${config?.paths?.di?.replace('./src', '@')}'`,
            `import type { ${upperCase}Store } from '${config?.paths?.stores?.replace('./src', '@')}/${entityName}'`,
            `import { ${lowerCase}ServiceMetadata } from './${entityName}.service.metadata'`,
            "import { Module } from '@alevnyacow/nzmt'",
            "@injectable()",
            `export class ${upperCase}Service {`,
            `\tconstructor(`,
            `\t\t@inject('${upperCase}Store' satisfies DITokens)`,
            `\t\tprivate readonly ${lowerCase}Store: ${upperCase}Store`,
            '\t) { }',
            '\t',
            `\tprivate method = Module.methods(${lowerCase}ServiceMetadata)`,
            '\t',
            `\tcreate = this.method('create', this.${lowerCase}Store.create);`,
            '\t',
            `\tgetSpecific = this.method('getSpecific', async (x) => {`,
            `\t\tconst item = await ${lowerCase}Store.details(x);`,
            `\t\treturn { item };`,
            `\t})`,
            `\t`,
            `\tgetList = this.method('getList', async (x) => {`,
            `\t\tconst items = await ${lowerCase}Store.list(x);`,
            `\t\treturn { items };`,
            `\t})`,
            `\t`,
            `\tupdateOne = this.method('updateOne', async (x) => {`,
            `\t\tawait ${lowerCase}Store.updateOne(x);`,
            `\t\treturn {};`,
            `\t})`,
            `\t`,
            `\tdeleteOne = this.method('deleteOne', async (x) => {`,
            `\t\tawait ${lowerCase}Store.deleteOne(x);`,
            `\t\treturn {};`,
            `\t})`,
            "}"
        ].filter(x => typeof x === 'string').join('\n'))
    } else {
        fs.writeFileSync(path.resolve(folder, `${entityName}.service.ts`), [
            "import { injectable } from 'inversify'",
            `import { ${lowerCase}ServiceMetadata } from './${entityName}.service.metadata'`,
            "import { Module } from '@alevnyacow/nzmt'",
            "",
            "@injectable()",
            `export class ${upperCase}Service {`,
            `\tprivate methods = Module.methods(${lowerCase}ServiceMetadata)`,
            "}"
        ].filter(x => typeof x === 'string').join('\n'))
    }

    // Barrel

    fs.writeFileSync(path.resolve(folder, 'index.ts'), [
        `export * from './${entityName}.service.metadata'`,
        `export * from './${entityName}.service'`
    ].join('\n'))

    // Update DI

    const diEntriesPath = path.resolve(process.cwd(), config?.paths?.di, 'entries.di.ts')

    insertBeforeLineInFile(
        diEntriesPath,
        'type DIEntries =',
        `import { ${upperCase}Service } from '${config?.paths?.services.replace('./src', '@')}/${entityName}}'\n`
    )

    insertAfterLineInFile(
        diEntriesPath,
        '// Services',
        `\t${upperCase}Service,`,
    )
}

if (command.toLowerCase() === 'service' || command === 'S') {
    var [lowerCase, upperCase] = camelizeVariants(entityName)
    generateService(lowerCase, upperCase, false)
    process.exit(0)
}

if (command.toLowerCase() === 'crud') {
    var [lowerCase, upperCase] = camelizeVariants(entityName)
    generateEntity(upperCase)
    generateStores(lowerCase, upperCase, true)
    generateService(lowerCase, upperCase, true)
    process.exit(0)
}