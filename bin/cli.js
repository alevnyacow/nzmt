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

function insertBeforeLineInFile(filePath, targetLine, newLine, before = true) {
  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split('\n');

  const index = lines.findIndex(line => line.includes(targetLine));

  if (index !== -1) {
    lines.splice(before ? index - 1 : index, 0, newLine);
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

        const folders = fs.readdirSync(projectRoot, { withFileTypes: true }).filter(x => x.isDirectory).map(x => x.name)
        const withSrcFolder = folders.includes('src')
        const coreFolder = withSrcFolder ? './src' : '.'
        
        const prismaClientPathOption = [entityName, ...options].filter(x => typeof x === 'string').find(x => x.startsWith('prismaClientPath:')) 

        let prismaClientPath = prismaClientPathOption ? prismaClientPathOption.split(':')[1] : undefined

        fs.writeFileSync(path.resolve(projectRoot, 'nzmt.config.json'), JSON.stringify(prismaClientPath ? {
            coreFolder,
            paths: {
                di: '/server/di',
                stores: '/server/stores',
                services: '/server/services',
                providers: '/server/providers',
                controllers: '/server/controllers',
                infrastructure: '/server/infrastructure',
                entities: '/domain/entities',
                valueObjects: '/domain/value-objects',
                sharedErrors: '/domain/errors',
                queries: '/ui/shared/queries',
                clientUtils: '/ui/shared/utils',
                widgets: '/ui/widgets'
            },
            store: {
                prisma: {
                    clientPath: prismaClientPath
                },
            },
            services: {
                defaultInjections: []
            }
        } : {
            coreFolder,
            paths: {
                di: '/server/di',
                stores: '/server/stores',
                services: '/server/services',
                providers: '/server/providers',
                controllers: '/server/controllers',
                infrastructure: '/server/infrastructure',
                entities: '/domain/entities',
                valueObjects: '/domain/value-objects',
                sharedErrors: '/domain/errors',
                queries: '/ui/shared/queries',
                clientUtils: '/ui/shared/utils',
                widgets: '/ui/widgets'
            },
            services: {
                defaultInjections: []
            }
        }, null, '\t'))
    }
}

function initSharedErrors() { 
    const config = loadConfig()
    const folder = path.resolve(process.cwd(), `${config.coreFolder}${config.paths.sharedErrors}`)
    fs.mkdirSync(folder, { recursive: true })
    
    fs.writeFileSync(path.resolve(folder, 'shared-error-codes.ts'), [
        "export enum CommonErrorCodes {",
        "\tNO_DATA_WAS_FOUND = 'COMMON___NO_DATA_WAS_FOUND'",
        "}"
    ].join('\n'))

    fs.writeFileSync(path.resolve(folder, 'index.ts'), "export * from './shared-error-codes'")
}

function initTSHelpers() {
    const config = loadConfig()
    const folder = path.resolve(process.cwd(), `${config.coreFolder}${config.paths.infrastructure}`)

    fs.writeFileSync(path.resolve(folder, 'ts-helpers.ts'), [
        "export type PublicFields<A> = { [k in keyof A]: A[k] }",
    ].join('\n'))
}

function initVO() {
    const config = loadConfig()
    const voFolder = path.resolve(process.cwd(), `${config.coreFolder}${config.paths.valueObjects}`)
    const identifierFolder = path.resolve(voFolder, 'identifier')

    fs.mkdirSync(identifierFolder, { recursive: true })

    fs.writeFileSync(path.resolve(identifierFolder, 'identifier.value-object.ts'), [
        "import { randomUUID } from 'node:crypto'",
        "import z from 'zod'",
        "",
        "export type IdentifierModel = z.infer<typeof Identifier.schema>",
        "",
        "export class Identifier {",
        "\tstatic schema = z.string().nonempty()",
        "\t",
        "\tprivate constructor(private readonly data: string) {}",
        "\t",
        "\tstatic create = (data: IdentifierModel) => {",
        "\t\treturn new Identifier(Identifier.schema.parse(data))",
        "\t}",
        "\t",
        "\tstatic get randomUUID() {",
        "\t\treturn Identifier.create(randomUUID())",
        "\t}",
        "\t",
        "\tget model(): IdentifierModel {",
        "\t\treturn this.data",
        "\t}",
        "}"
    ].join('\n'))

    fs.writeFileSync(path.resolve(identifierFolder, 'index.ts'), "export * from './identifier.value-object'")
}

function initDI() {
    const config = loadConfig()
    const diPath = config?.paths?.di

    const folder = path.resolve(process.cwd(), `${config.coreFolder}${diPath}`)
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
        "\t// Infrastructure",
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
        "}",
        "",
        "export { DITokens }"
    ].join('\n'))
};

function initClientUtils() {
    const config = loadConfig()
    const root = findProjectRoot()
    const folder = path.resolve(root, `${config.coreFolder}${config.paths.clientUtils}`)
    fs.mkdirSync(folder, { recursive: true })

    fs.writeFileSync(path.resolve(folder, 'api-request.ts'), [
        "export const apiRequest = (url: string, method: 'GET' | 'POST' | 'DELETE' | 'PATCH' | 'PUT') =>",
        "\tasync (payload: { body?: Object; query?: Object }) => {",
        "\t\tconst query = payload?.query ? '?' + new URLSearchParams(Object.entries(payload.query).filter(([, v]) => v != null && v !== '')) : ''",
        "\t\tconst res = await fetch(url + query, { method, headers: { 'Content-Type': 'application/json' }, body: payload?.body && JSON.stringify(payload.body) })",
        "\t\tif (!res.ok) throw await res.json()",
        "\t\treturn res.json()",
        "\t}"
    ].join('\n'))

    fs.writeFileSync(path.resolve(folder, 'normalize-query-key-payload.ts'), [
        'export const normalizeObjectKeysOrder = (input: any): any => {',
        '\tif (Array.isArray(input)) {',
        '\t\treturn input.map(item => normalizeObjectKeysOrder(item))',
        '\t}',
        '',
        '\tif (input !== null && typeof input === "object") {',
        '\t\tconst sortedKeys = Object.keys(input).sort((a, b) => a.localeCompare(b))',
        '\t\tconst result: Record<string, any> = {}',
        '\t\tfor (const key of sortedKeys) {',
        '\t\t\tresult[key] = normalizeObjectKeysOrder(input[key])',
        '\t\t}',
        '\t\treturn result',
        '\t}',
        '',
        '\treturn input',
        '}'
    ].join('\n'))

    fs.writeFileSync(path.resolve(folder, 'index.ts'), [
        `export * from './api-request'`,
        `export * from './normalize-query-key-payload'`
    ].join('\n'))
}

function initPrisma() {
    const config = loadConfig()
    const prismaClientPath = config?.store?.prisma?.clientPath
    if (!prismaClientPath) {
        return
    }
    const prismaFolder = path.resolve(process.cwd(), `${config.coreFolder}${config?.paths?.infrastructure}`, 'prisma')
    fs.mkdirSync(prismaFolder, { recursive: true })

    fs.writeFileSync(path.resolve(prismaFolder, 'client.ts'), [
        '/** ! import required Prisma adapter */',
        `import { PrismaClient } from '${prismaClientPath}'`,
        ``,
        'const connectionString = `${process.env.DATABASE_URL}`',
        `const adapter = /** ! instanse of the adapter */`,
        ``,
        `export const prismaClient = new PrismaClient({ adapter })`
    ].join('\n'))

    fs.writeFileSync(path.resolve(prismaFolder, 'index.ts'), [
        `export * from './client'`
    ].join('\n'))

    // Update DI

    const diEntriesPath = path.resolve(process.cwd(), `${config.coreFolder}${config?.paths?.di}`, 'entries.di.ts')

    insertBeforeLineInFile(
        diEntriesPath,
        'type DIEntries =',
        `import { prismaClient } from '@${config?.paths?.infrastructure}/prisma'`
    )

    insertAfterLineInFile(
        diEntriesPath,
        '// Infrastructure',
        `\tPrismaClient: { constantValue: prismaClient },`,
    )
}

function generateInfrastructure(upperCase, lowerCase) {
    const config = loadConfig()
    const folder = path.resolve(process.cwd(), `${config.coreFolder}${config?.paths?.infrastructure}`, entityName)
    fs.mkdirSync(folder, { recursive: true })

    fs.writeFileSync(path.resolve(folder, `${entityName}.ts`), [
        `import { Module } from '@alevnyacow/nzmt'`,
        '',
        `export const ${lowerCase}InfrastructureMetadata = {`,
        `\tname: '${upperCase}Infrastructure',`,
        `\tschemas: {}`,
        `} satisfies Module.Metadata`,
        '',
        `export class ${upperCase} {`,
        `\tprivate methods = Module.methods(${lowerCase}InfrastructureMetadata)`,
        `}`
    ].join('\n'))

    fs.writeFileSync(path.resolve(folder, `${entityName}.mock.ts`), [
        `import { PublicFields } from '@/${config.paths.infrastructure}/ts-helpers'`,
        `import { ${upperCase} } from './${entityName}'`,
        '',
        `export class Mock${upperCase} implements PublicFields<${upperCase}> {`,
        `\t`,
        `}`
    ].join('\n'))

    fs.writeFileSync(path.resolve(folder, `index.ts`), [
        `export * from './${entityName}'`,
        `export * from './${entityName}.mock'`
    ].join('\n'))

    // Update DI

    const diEntriesPath = path.resolve(process.cwd(), `${config.coreFolder}${config?.paths?.di}`, 'entries.di.ts')

    insertBeforeLineInFile(
        diEntriesPath,
        'type DIEntries =',
        `import { ${upperCase}, Mock${upperCase} } from '@${config?.paths?.infrastructure}/${entityName}'`
    )

    insertAfterLineInFile(
        diEntriesPath,
        '// Infrastructure',
        `\t${upperCase}: { test: Mock${upperCase}, dev: ${upperCase}, prod: ${upperCase} },`,
    )
}


function initGuards() {
    const config = loadConfig()
    const endpointGuardsFolder = path.resolve(process.cwd(), `${config.coreFolder}${config?.paths?.infrastructure}`, 'guards')
    fs.mkdirSync(endpointGuardsFolder, { recursive: true })

    fs.writeFileSync(path.resolve(endpointGuardsFolder, 'guards.ts'), [
        `import type { Controller } from '@alevnyacow/nzmt'`,
        '',
        `export class Guards {`,
        `\tdummyGuard: Controller.Guard = async () => { return undefined }`,
        `}`
    ].join('\n'))

    fs.writeFileSync(path.resolve(endpointGuardsFolder, 'index.ts'), [
        `export * from './guards'`
    ].join('\n'))

    // Update DI

    const diEntriesPath = path.resolve(process.cwd(), `${config.coreFolder}${config?.paths?.di}`, 'entries.di.ts')

    insertBeforeLineInFile(
        diEntriesPath,
        'type DIEntries =',
        `import { Guards } from '@${config?.paths?.infrastructure}/guards'`
    )

    insertAfterLineInFile(
        diEntriesPath,
        '// Infrastructure',
        `\tGuards,`,
    )
}

function initLogger() {
    const config = loadConfig()
    const loggerFolder = path.resolve(process.cwd(), `${config.coreFolder}${config?.paths?.infrastructure}`, 'logger')
    fs.mkdirSync(loggerFolder, { recursive: true })

    fs.writeFileSync(path.resolve(loggerFolder, 'logger.ts'), [
        `export abstract class Logger {`,
        `\tabstract error: (payload: Record<string, unknown>) => Promise<void>`,
        `}`
    ].join('\n'))

    fs.writeFileSync(path.resolve(loggerFolder, 'logger.console.ts'), [
        `import { injectable } from 'inversify'`,
        `import { Logger } from './logger'`,
        '',
        '@injectable()',
        `export class ConsoleLogger extends Logger {`,
        `\terror: Logger['error'] = async (payload) => console.error(payload)`,
        `}`
    ].join('\n'))


    fs.writeFileSync(path.resolve(loggerFolder, 'index.ts'), [
        `export * from './logger'`,
        `export * from './logger.console'`
    ].join('\n'))

    // Update DI

    const diEntriesPath = path.resolve(process.cwd(), `${config.coreFolder}${config?.paths?.di}`, 'entries.di.ts')

    insertBeforeLineInFile(
        diEntriesPath,
        'type DIEntries =',
        `import { ConsoleLogger } from '@${config?.paths?.infrastructure}/logger'`
    )

    insertAfterLineInFile(
        diEntriesPath,
        '// Infrastructure',
        `\tLogger: ConsoleLogger,`,
    )
}

if (command.toLowerCase() === 'init') {
    createDefaultConfig()
    initDI()
    initClientUtils()
    initVO()
    initSharedErrors()
    initPrisma()
    initLogger()
    initGuards()
    initTSHelpers()

    process.exit(0)
}

function generateStores(lowerCase, upperCase, withEntityPreset) {
    const folder = config?.paths?.stores ? path.resolve(process.cwd(), `${config.coreFolder}${config?.paths?.stores}`, entityName) : path.resolve(process.cwd(), entityName);

    fs.mkdirSync(folder, { recursive: true })

    const withEntity = withEntityPreset || (options ?? []).includes('import-entity')

    // Contract

    fs.writeFileSync(path.resolve(folder, `${entityName}.store.ts`), [
        "import { Store } from '@alevnyacow/nzmt'",
        withEntity ? `import { ${upperCase} } from '@${config?.paths?.entities}/${entityName}'` : undefined,
        "",
        `export const ${lowerCase}StoreMetadata = {`,
        "\tmodels: {",
        withEntity ? `\t\tlist: ${upperCase}.schema,` : "\t\tlist: z.object({ }),",
        withEntity ? `\t\tdetails: ${upperCase}.schema,` : "\t\tdetails: z.object({ }),",
        "\t},",
        "",
        "\tsearchPayload: {",
        withEntity ? `\t\tlist: ${upperCase}.schema.omit({ id: true }).partial(),` : "\t\tlist: z.object({ }),",
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
        `export const { schemas: ${lowerCase}StoreSchemas } = Store.toModuleMetadata(${lowerCase}StoreMetadata)`,
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
    const prismaPath = config.store?.prisma?.clientPath
    if (prismaPath) {
        fs.writeFileSync(path.resolve(folder, `${entityName}.store.prisma.ts`), [
            `import type { Prisma, PrismaClient } from '${prismaPath}'`,
            `import { DITokens } from '@${config?.paths?.di}'`,
            "import { injectable, inject } from 'inversify'",
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
            `\ttoDetails: (source: Prisma.${upperCase}GetPayload<{}>): Types['details'] => {`,
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
            "\tconstructor(@inject('PrismaClient' satisfies DITokens) private readonly prismaClient: PrismaClient) {}",
            "",
            "\tlist = this.method('list', async ({ filter, pagination: { pageSize, zeroBasedIndex } = { pageSize: 1000, zeroBasedIndex: 0 }}) => {",
            `\t\tconst list = await this.prismaClient.${lowerCase}.findMany({`,
            "\t\t\twhere: mappers.toFindListPayload(filter),",
            "\t\t\tskip: zeroBasedIndex * pageSize,",
            "\t\t\ttake: pageSize",
            "\t\t})",
            "\t\t",
            "\t\treturn list.map(mappers.toListModel)",
            "\t});",
            "",
            "\tdetails = this.method('details', async ({ filter }) => {",
            `\t\tconst details = await this.prismaClient.${lowerCase}.findUnique({`,
            "\t\t\twhere: mappers.toFindOnePayload(filter)",
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
            `\t\tconst { id } = await this.prismaClient.${lowerCase}.create({`,
            "\t\t\tdata: mappers.toCreatePayload(payload),",
            "\t\t\tselect: { id: true }",
            "\t\t})",
            "",
            "\t\treturn { id }",
            "\t});",
            "",
            "\tupdateOne = this.method('updateOne', async ({ filter, payload }) => {",
            "\t\ttry {",
            `\t\t\tawait this.prismaClient.${lowerCase}.update({`,
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
            `\t\t\tawait this.prismaClient.${lowerCase}.delete({`,
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
    }


    // barrel

    fs.writeFileSync(path.resolve(folder, 'index.ts'), [
        `export * from './${entityName}.store.ts'`,
        prismaPath ? `export * from './${entityName}.store.prisma.ts'` : undefined,
        `export * from './${entityName}.store.ram.ts'`
    ].filter(x => typeof x === 'string').join('\n'))

    // update DI
    
    const diEntriesPath = path.resolve(process.cwd(), `${config.coreFolder}${config?.paths?.di}`, 'entries.di.ts')

    insertBeforeLineInFile(
        diEntriesPath,
        'type DIEntries =',
        prismaPath ? `import { ${upperCase}PrismaStore, ${upperCase}RAMStore } from '@${config?.paths?.stores}/${entityName}'` : `import { ${upperCase}RAMStore } from '@${config?.paths?.stores}/${entityName}'`
    )

    insertAfterLineInFile(
        diEntriesPath,
        '// Stores',
        prismaPath ? `\t${upperCase}Store: { test: [${upperCase}RAMStore, (x) => x.inSingletonScope()], prod: ${upperCase}PrismaStore, dev: ${upperCase}PrismaStore },` : `\t${upperCase}Store: { test: [${upperCase}RAMStore, (x) => x.inSingletonScope()], prod: ${upperCase}RAMStore, dev: ${upperCase}RAMStore },`,
    )

}

if (command.toLowerCase() === 'store' || command === 'cs') {
    var [lowerCase, upperCase] = camelizeVariants(entityName)
    generateStores(lowerCase, upperCase)
    process.exit(0);
}

function generateEntity(upperCase) {
    const folder = config?.paths?.entities ? path.resolve(process.cwd(), `${config.coreFolder}${config?.paths?.entities}`, entityName) : path.resolve(process.cwd(), entityName);
    const fields = options.filter(x => x.startsWith('f:')).flatMap(x => x.split(':')[1]).join(',').split(',').map(x => x.split('-')).filter(x => x.length === 2)

    fs.mkdirSync(folder, { recursive: true })

    const body = [
        "import z from 'zod'",
        `import { Identifier } from '@${config?.paths?.valueObjects}/identifier'`,
        "",
        `export type ${upperCase}Model = z.infer<typeof ${upperCase}.schema>`,
        "",
        `export class ${upperCase} {`,
        "\tstatic schema = z.object({",
        "\t\tid: Identifier.schema,",
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
    const folder = config?.paths?.valueObjects ? path.resolve(process.cwd(), `${config.coreFolder}${config?.paths?.valueObjects}`, entityName) : path.resolve(process.cwd(), entityName);
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
    const folder = config?.paths?.providers ? path.resolve(process.cwd(), `${config.coreFolder}${config?.paths?.providers}`, entityName) : path.resolve(process.cwd(), entityName);
    
    fs.mkdirSync(folder, { recursive: true })
    
    // Provider
    fs.writeFileSync(path.resolve(folder, `${entityName}.provider.ts`), [
        `import { Module } from '@alevnyacow/nzmt'`,
        '',
        `export const ${lowerCase}ProviderMetadata = {`,
        `\tname: '${upperCase}Provider',`,
        `\tschemas: {}`,
        `} satisfies Module.Metadata`,
        '',
        `export class ${upperCase}Provider {`,
        `\tprivate methods = Module.methods(${lowerCase}ProviderMetadata)`,
        `}`
    ].join('\n'))

    // Mock
    fs.writeFileSync(path.resolve(folder, `${entityName}.provider.mock.ts`), [
        `import { PublicFields } from '@/${config.paths.infrastructure}/ts-helpers'`,
        `import { ${upperCase}Provider } from './${entityName}.provider'`,
        '',
        `export class ${upperCase}MockProvider implements PublicFields<${upperCase}Provider> {`,
        `\t`,
        `}`
    ].join('\n'))

    // Barrel
    fs.writeFileSync(path.resolve(folder, `index.ts`), [
        `export * from './${entityName}.provider'`,
        `export * from './${entityName}.provider.mock'`
    ].join('\n'))

    // Update DI
    const diEntriesPath = path.resolve(process.cwd(), `${config.coreFolder}${config?.paths?.di}`, 'entries.di.ts')

    insertBeforeLineInFile(
        diEntriesPath,
        'type DIEntries =',
        `import { ${upperCase}MockProvider, ${upperCase}Provider } from '@${config?.paths?.providers}/${entityName}'`
    )

    insertAfterLineInFile(
        diEntriesPath,
        '// Providers',
        `\t${upperCase}Provider: { test: ${upperCase}MockProvider, prod: ${upperCase}Provider, dev: ${upperCase}Provider },`,
    )
}

if (command.toLowerCase() === 'provider' || command === 'p') {
    var [lowerCase, upperCase] = camelizeVariants(entityName)
    generateProvider(lowerCase, upperCase)
    process.exit(0)
}

function toKebabFromPascal(str) {
  return str
    .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
    .toLowerCase()
}

function generateService(lowerCase, upperCase, store) {
    const folder = config?.paths?.services ? path.resolve(process.cwd(), `${config.coreFolder}${config?.paths?.services}`, entityName) : path.resolve(process.cwd(), entityName);
    const defaultInjections = config?.services?.defaultInjections

    const proxiedStore = store || options.find(x => x.startsWith('p:'))?.split(':')?.at(-1)
    if (proxiedStore && !proxiedStore.endsWith('Store')) {
        throw 'Only stores can be proxied in services!'
    }

    let injections = options.filter(x => x.startsWith('i:')).flatMap(x => x.split(':')[1]).join(',').split(',').filter(x => !!x.length)
    if (proxiedStore && !injections.includes(proxiedStore)) {
        injections = injections.concat(proxiedStore)
    }

    injections = [...defaultInjections, ...injections.filter(x => !defaultInjections.includes(x))]

    const importInjections = injections.map((i) => {
        if (i.endsWith('Service') || i.endsWith('Controller')) {
            throw 'Only stores and infrastructure can be injected in services'
        }

        if (i.endsWith('Store')) {
            return `import type { ${i} } from '@${config?.paths?.stores}/${toKebabFromPascal(i).slice(0, -'-store'.length)}'`
        }

        return `import type { ${i} } from '@${config?.paths?.infrastructure}/${toKebabFromPascal(i)}'`
    })

    fs.mkdirSync(folder, { recursive: true })

    // Metadata

    fs.writeFileSync(path.resolve(folder, `${entityName}.service.metadata.ts`), [
        "import type { Module } from '@alevnyacow/nzmt'",
        proxiedStore ? `import { ${proxiedStore.substring(0, 1).toLowerCase() + proxiedStore.substring(1)}Schemas } from '@${config?.paths?.stores}/${toKebabFromPascal(proxiedStore).slice(0, -'-store'.length)}'` : undefined,
        "",
        `export const ${lowerCase}ServiceMetadata = {`,
        `\tname: '${upperCase}Service',`,
        proxiedStore ? [
            `\tschemas: {`,
            `\t\tgetList: ${proxiedStore.substring(0, 1).toLowerCase() + proxiedStore.substring(1)}Schemas.list,`,
            `\t\tgetDetails: ${proxiedStore.substring(0, 1).toLowerCase() + proxiedStore.substring(1)}Schemas.details,`,
            `\t\tcreate: ${proxiedStore.substring(0, 1).toLowerCase() + proxiedStore.substring(1)}Schemas.create,`,
            `\t\tupdate: ${proxiedStore.substring(0, 1).toLowerCase() + proxiedStore.substring(1)}Schemas.updateOne,`,
            `\t\tdelete: ${proxiedStore.substring(0, 1).toLowerCase() + proxiedStore.substring(1)}Schemas.deleteOne,`,
            `\t}`,
        ].join('\n') : "\tschemas: {}",
        "} satisfies Module.Metadata",
        "",
        `export type ${upperCase}ServiceDTOs = Module.DTOs<typeof ${lowerCase}ServiceMetadata>`
    ].filter(x => typeof x === 'string').join('\n'))
    

    // Service body

    fs.writeFileSync(path.resolve(folder, `${entityName}.service.ts`), [
        "import { injectable, inject } from 'inversify'",
        injections.length ? `import { DITokens } from '@${config?.paths?.di}'` : undefined,
        `import { ${lowerCase}ServiceMetadata } from './${entityName}.service.metadata'`,
        "import { Module } from '@alevnyacow/nzmt'",
        ...importInjections,
        "",
        `type Methods = Module.Methods<typeof ${lowerCase}ServiceMetadata>`,
        "",
        "@injectable()",
        `export class ${upperCase}Service implements Methods {`,
        `\tprivate methods = Module.methods(${lowerCase}ServiceMetadata)`,
        ``,
        `\tconstructor(`,
        ...injections.map(x => `\t\t@inject('${x}' satisfies DITokens) private readonly ${x.charAt(0).toLowerCase() + x.slice(1)}: ${x},`),
        `\t) {}`,
        ``,
        proxiedStore ? `\tgetList = this.methods('getList', this.${proxiedStore.charAt(0).toLowerCase() + proxiedStore.slice(1)}.list)` : undefined,
        proxiedStore ? `\tgetDetails = this.methods('getDetails', this.${proxiedStore.charAt(0).toLowerCase() + proxiedStore.slice(1)}.details)` : undefined,
        proxiedStore ? `\tcreate = this.methods('create', this.${proxiedStore.charAt(0).toLowerCase() + proxiedStore.slice(1)}.create)` : undefined,
        proxiedStore ? `\tupdate = this.methods('update', this.${proxiedStore.charAt(0).toLowerCase() + proxiedStore.slice(1)}.updateOne)` : undefined,
        proxiedStore ? `\tdelete = this.methods('delete', this.${proxiedStore.charAt(0).toLowerCase() + proxiedStore.slice(1)}.deleteOne)` : undefined,
        "}"
    ].filter(x => typeof x === 'string').join('\n'))
    

    // Barrel

    fs.writeFileSync(path.resolve(folder, 'index.ts'), [
        `export * from './${entityName}.service.metadata'`,
        `export * from './${entityName}.service'`
    ].join('\n'))

    // Update DI

    const diEntriesPath = path.resolve(process.cwd(), `${config.coreFolder}${config?.paths?.di}`, 'entries.di.ts')

    insertBeforeLineInFile(
        diEntriesPath,
        'type DIEntries =',
        `import { ${upperCase}Service } from '@${config?.paths?.services}/${entityName}'`
    )

    insertAfterLineInFile(
        diEntriesPath,
        '// Services',
        `\t${upperCase}Service,`,
    )
}

if (command.toLowerCase() === 'service' || command === 's') {
    var [lowerCase, upperCase] = camelizeVariants(entityName)
    generateService(lowerCase, upperCase, false)
    process.exit(0)
}

function generateController(upperCase, lowerCase, crudService) {
    if (crudService && !crudService.endsWith('Service')) {
        throw 'Incorrect crudService'
    }

    const folder = config?.paths?.controllers ? path.resolve(process.cwd(), `${config.coreFolder}${config?.paths?.controllers}`, entityName) : path.resolve(process.cwd(), entityName);

    let injections = options.filter(x => x.startsWith('i:')).flatMap(x => x.split(':')[1]).join(',').split(',').filter(x => !!x.length)
    if (crudService && !injections.includes(crudService)) {
        injections = injections.concat(crudService)
    }

    injections = ['Logger', 'Guards', ...injections.filter(x => x !== 'Logger' && x !== 'Guards')]

    const crudServiceLowercase = crudService ? crudService.substring(0, 1).toLowerCase() + crudService.substring(1) : undefined

    const importInjections = injections.map((i) => {
        if (i.endsWith('Controller')) {
            throw 'Only stores, services and infrastructure can be injected in controllers'
        }

        if (i.endsWith('Store')) {
            return `import type { ${i} } from '@${config?.paths?.stores}/${toKebabFromPascal(i).slice(0, -'-store'.length)}'`
        }

        if (i.endsWith('Service')) {
            return `import type { ${i} } from '@${config?.paths?.services}/${toKebabFromPascal(i).slice(0, -'-service'.length)}'`
        }

        return `import type { ${i} } from '@${config?.paths?.infrastructure}/${toKebabFromPascal(i)}'`
    })

    fs.mkdirSync(folder, { recursive: true })

    // Metadata

    fs.writeFileSync(path.resolve(folder, `${entityName}.controller.metadata.ts`), [
        crudService ? `import z from 'zod'` : undefined,
        `import { Controller, ValueObjects } from '@alevnyacow/nzmt'`,
        crudService ? `import { ${crudServiceLowercase}Metadata } from '@${config.paths.services}/${toKebabFromPascal(crudService).slice(0, -'-service'.length)}'` : undefined,
        ``,
        `export const ${lowerCase}ControllerMetadata = {`,
        `\tname: '${upperCase}Controller',`,
        crudService ? [
            `\tschemas: {`,
            `\t\tGET: {`,
            `\t\t\tquery: z.union([`,
            `\t\t\t\t// Request all items`,
            `\t\t\t\t${crudServiceLowercase}Metadata.schemas.getList.payload.shape.filter,`,
            '\t\t\t\t// Request specific page',
            `\t\t\t\tValueObjects.Pagination.schema.extend(${crudServiceLowercase}Metadata.schemas.getList.payload.shape.filter.shape),`,
            `\t\t\t]),`,
            `\t\t\tresponse: ${crudServiceLowercase}Metadata.schemas.getList.response`,
            `\t\t},`,
            `\t\tdetails_GET: {`,
            `\t\t\tquery: ${crudServiceLowercase}Metadata.schemas.getDetails.payload,`,
            '\t\t\t// unwrap() to remove null',
            `\t\t\tresponse: ${crudServiceLowercase}Metadata.schemas.getDetails.response.unwrap()`,
            `\t\t},`,
            `\t\tPOST: {`,
            `\t\t\tbody: ${crudServiceLowercase}Metadata.schemas.create.payload,`,
            `\t\t\tresponse: ${crudServiceLowercase}Metadata.schemas.create.response`,
            `\t\t},`,
            `\t\tPATCH: {`,
            `\t\t\tbody: ${crudServiceLowercase}Metadata.schemas.update.payload,`,
            `\t\t\tresponse: ${crudServiceLowercase}Metadata.schemas.update.response`,
            `\t\t},`,
            `\t\tDELETE: {`,
            `\t\t\tquery: ${crudServiceLowercase}Metadata.schemas.delete.payload.shape.filter,`,
            `\t\t\tresponse: ${crudServiceLowercase}Metadata.schemas.delete.response`,
            `\t\t},`,
            `\t}`,
        ].join('\n') : `\tschemas: {}`,
        `} satisfies Controller.Metadata`,
        ``,
        `export type ${upperCase}API = Controller.Contract<typeof ${lowerCase}ControllerMetadata>`
    ].filter(x => typeof x === 'string').join('\n'))

    // Body

    fs.writeFileSync(path.resolve(folder, `${entityName}.controller.ts`), [
        `import { injectable, inject } from 'inversify'`,
        `import { Controller } from '@alevnyacow/nzmt'`,
        `import { DITokens } from '@${config?.paths?.di}'`,
        crudService ? `import { CommonErrorCodes } from '@${config?.paths?.sharedErrors}'` : undefined,
        `import { ${lowerCase}ControllerMetadata } from './${entityName}.controller.metadata'`,
        ...importInjections,
        ``,
        `type Endpoints = Controller.EndpointList<typeof ${lowerCase}ControllerMetadata>`,
        ``,
        `@injectable()`,
        `export class ${upperCase}Controller implements Endpoints {`,
        `\tconstructor(`,
        ...injections.map(x => `\t\t@inject('${x}' satisfies DITokens) private readonly ${x.charAt(0).toLowerCase() + x.slice(1)}: ${x},`),
        `\t) {}`,
        ``,
        `\tprivate readonly endpoints = Controller.endpoints(`,
        `\t\t${lowerCase}ControllerMetadata,`,
        '\t\t{ onErrorHandlers: [this.logger.error], guards: [] }',
        '\t)',
        ``,
        crudService ? [
            `\tGET = this.endpoints('GET', async (x) => {`,
            `\t\tif ('pageSize' in x && 'zeroBasedIndex' in x) {`,
            `\t\t\tconst { pageSize, zeroBasedIndex, ...filter } = x`,
            `\t\t\treturn await this.${crudServiceLowercase}.getList({ filter, pagination: { pageSize, zeroBasedIndex } })`,
            `\t\t}`,
            `\t\treturn await this.${crudServiceLowercase}.getList({ filter: x })`,
            `\t})`,
            ``,
            `\tdetails_GET = this.endpoints('details_GET', async (payload, { endpointError }) => {`,
            `\t\tconst details = await this.${crudServiceLowercase}.getDetails(payload)`,
            `\t\tif (!details) { throw endpointError(CommonErrorCodes.NO_DATA_WAS_FOUND, 404) }`,
            `\t\treturn details`,
            `\t})`,
            ``,
            `\tPOST = this.endpoints('POST', this.${crudServiceLowercase}.create)`,
            `\tPATCH = this.endpoints('PATCH', this.${crudServiceLowercase}.update)`,
            `\tDELETE = this.endpoints('DELETE', (filter) => this.${crudServiceLowercase}.delete({ filter }))`,
        ].join('\n') : undefined,
        `}`
    ].filter(x => typeof x === 'string').join('\n'))

    // Barrel

    fs.writeFileSync(path.resolve(folder, `index.ts`), [
        `export * from './${entityName}.controller'`,
        `export * from './${entityName}.controller.metadata'`
    ].filter(x => typeof x === 'string').join('\n'))

    // Update DI

    const diEntriesPath = path.resolve(process.cwd(), `${config.coreFolder}${config?.paths?.di}`, 'entries.di.ts')

    insertBeforeLineInFile(
        diEntriesPath,
        'type DIEntries =',
        `import { ${upperCase}Controller } from '@${config?.paths?.controllers}/${entityName}'`
    )

    insertAfterLineInFile(
        diEntriesPath,
        '// Controllers',
        `\t${upperCase}Controller,`,
    )
}

function generateAPIRoutes(lowerCase, upperCase, entity) {
    const requiredEntity = entity || entityName
    const projectRoot = findProjectRoot()
    const fileText = fs.readFileSync(
        path.resolve(projectRoot, `${config.coreFolder}${config.paths.controllers}`, requiredEntity, `${requiredEntity}.controller.ts`),
        'utf-8'
    )

    const regex = /^\s*(\w+)\s*=\s*this\.endpoints/mg
    const methods = Array.from(fileText.matchAll(regex), m => m[1])

    const methodInfo = methods.map(method => ({method: method.split('_').pop(), path: method.split('_').slice(0, -1).join('/')}))

    const rootMethods = methodInfo.filter(x => !x.path.length).map(x => x.method)
    const nestedMethods = methodInfo.filter(x => !!x.path.length).reduce((acc, cur) => {
        if (!acc[cur.path]) {
            acc[cur.path] = []
        }
        acc[cur.path].push(cur.method)
        return acc
    }, {})

    const controllerHandlersRootPath = path.resolve(projectRoot, config.coreFolder, 'app', 'api', `${requiredEntity}-controller`)
    
    if (fs.existsSync(controllerHandlersRootPath)) {
        fs.rmSync(controllerHandlersRootPath, { force: true, recursive: true })
    }

    fs.mkdirSync(controllerHandlersRootPath, { recursive: true })

    if (rootMethods.length) {
        fs.writeFileSync(path.resolve(controllerHandlersRootPath, 'route.ts'), [
            `import type { ${upperCase}Controller } from '@${config.paths.controllers}/${requiredEntity}'`,
            `import { fromDI } from '@${config.paths.di}'`,
            '',
            `const controller = fromDI<${upperCase}Controller>('${upperCase}Controller')`,
            '',
            rootMethods.map(x => `export const ${x} = controller.${x}`).join('\n')
        ].join('\n'))
    }

    for (const [currentPath, methods] of Object.entries(nestedMethods)) {
        const nestedFolder = path.resolve(controllerHandlersRootPath, currentPath)
        fs.mkdirSync(nestedFolder, { recursive: true })
        fs.writeFileSync(path.resolve(nestedFolder, 'route.ts'), [
            `import type { ${upperCase}Controller } from '@${config.paths.controllers}/${requiredEntity}'`,
            `import { fromDI } from '@${config.paths.di}'`,
            '',
            `const controller = fromDI<${upperCase}Controller>('${upperCase}Controller')`,
            '',
            methods.map(x => `export const ${x} = controller.${currentPath.replaceAll('/', '_')}_${x}`).join('\n')
        ].join('\n'))
    }   
}

function generateQueries(lowerCase, upperCase, entity) {
    const requiredEntity = entity || entityName
    const projectRoot = findProjectRoot()

    const fileText = fs.readFileSync(
        path.resolve(projectRoot, `${config.coreFolder}${config.paths.controllers}`, requiredEntity, `${requiredEntity}.controller.ts`),
        'utf-8'
    )

    const regex = /^\s*(\w+)\s*=\s*this\.endpoints/mg
    const methods = Array.from(fileText.matchAll(regex), m => m[1])

    const methodInfo = methods.map(method => ({method: method.split('_').pop(), path: method.split('_').slice(0, -1).join('/')}))

    const rootMethods = methodInfo.filter(x => !x.path.length).map(x => x.method)
    const nestedMethods = methodInfo.filter(x => !!x.path.length).reduce((acc, cur) => {
        if (!acc[cur.path]) {
            acc[cur.path] = []
        }
        acc[cur.path].push(cur.method)
        return acc
    }, {})

    const controllerQueriesPath = path.resolve(projectRoot, `${config.coreFolder}${config.paths.queries}`, `${requiredEntity}`, 'endpoints')
    let scaffoldedMethods = []

    fs.mkdirSync(controllerQueriesPath, { recursive: true })

    for (const rootMethod of rootMethods) {
        scaffoldedMethods.push(rootMethod)
        if (!rootMethod) {
            continue
        }
        const fileName = path.resolve(controllerQueriesPath, `${rootMethod}.ts` )
        const alreadyExists = fs.existsSync(fileName)
        if (alreadyExists) {
            continue
        }
        fs.writeFileSync(fileName, [
            `import { ${rootMethod === 'GET' ? 'useQuery' : 'useMutation, useQueryClient'} } from '@tanstack/react-query'`,
            `import type { ${upperCase}API } from '@${config.paths.controllers}/${requiredEntity}'`,
            `import { apiRequest${rootMethod === 'GET' ? ', normalizeObjectKeysOrder' : ''} } from '@${config.paths.clientUtils}'`,
            '',
            `type Method = ${upperCase}API['endpoints']['${rootMethod}']`,
            ``,
            `const endpoint = '/api/${requiredEntity}-controller'`,
            ``,
            rootMethod === 'GET' 
                ? [
                    `export const use${rootMethod} = (payload: Method['payload']) => {`,
                    `\treturn useQuery<Method['response'], Method['error']>({`,
                    `\t\tqueryKey: ['${requiredEntity}', '${rootMethod}', normalizeObjectKeysOrder(payload)],`,
                    `\t\tqueryFn: () => apiRequest(endpoint, 'GET')(payload)`,
                    `\t})`,
                    `}`
                ].join('\n') 
                : [
                    `export const use${rootMethod} = () => {`,
                    `\tconst queryClient = useQueryClient()`,
                    `\treturn useMutation<Method['response'], Method['error'], Method['payload']>({`,
                    `\t\tmutationFn: apiRequest(endpoint, '${rootMethod}'),`,
                    `\t\tonSuccess: () => { queryClient.invalidateQueries({ queryKey: ['${requiredEntity}'], exact: false }) }`,
                    `\t})`,
                    `}`
                ].join('\n')
        ].join('\n'))
    }

    for (const [currentPath, methods] of Object.entries(nestedMethods)) {
        for (const method of methods) {
            const fullMethodName = `${currentPath.replaceAll('/', '_')}_${method}`
            scaffoldedMethods.push(fullMethodName)
            const fileName = path.resolve(controllerQueriesPath, `${fullMethodName}.ts`)
            const alreadyExists = fs.existsSync(fileName)
            if (alreadyExists) {
                continue
            }

            const nameForHook = (fullMethodName.charAt(0).toUpperCase() + fullMethodName.slice(1)).replaceAll('_', '');

            fs.writeFileSync(fileName, [
                `import { ${method === 'GET' ? 'useQuery' : 'useMutation, useQueryClient' } } from '@tanstack/react-query'`,
                `import type { ${upperCase}API } from '@${config.paths.controllers}/${requiredEntity}'`,
                `import { apiRequest${method === 'GET' ? ', normalizeObjectKeysOrder' : ''} } from '@${config.paths.clientUtils}'`,
                '',
                `type Method = ${upperCase}API['endpoints']['${fullMethodName}']`,
                ``,
                `const endpoint = '/api/${requiredEntity}-controller/${currentPath}'`,
                ``,
                method === 'GET' 
                    ? [
                        `export const use${nameForHook} = (payload: Method['payload']) => {`,
                        `\treturn useQuery<Method['response'], Method['error']>({`,
                        `\t\tqueryKey: ['${requiredEntity}', ${currentPath.split('/').map(x => `'${x}'`).join(', ')}, normalizeObjectKeysOrder(payload)],`,
                        `\t\tqueryFn: () => apiRequest(endpoint, 'GET')(payload)`,
                        `\t})`,
                        `}`
                    ].join('\n') 
                    : [
                        `export const use${nameForHook} = () => {`,
                        `\tconst queryClient = useQueryClient()`,
                        `\treturn useMutation<Method['response'], Method['error'], Method['payload']>({`,
                        `\t\tmutationFn: apiRequest(endpoint, '${method}'),`,
                        `\t\tonSuccess: () => { queryClient.invalidateQueries({ queryKey: ['${requiredEntity}'], exact: false }) }`,
                        `\t})`,
                        `}`
                    ].join('\n')
            ].join('\n'))

        }
    }
    
    const allQueryFiles = fs.readdirSync(controllerQueriesPath, { withFileTypes: true }).filter(x => x.isFile())
    const deprecatedQueries = allQueryFiles.filter(x => scaffoldedMethods.every(scaffolded => !x.name.startsWith(scaffolded))).map(x => x.name)

    for (const deprecated of deprecatedQueries) {
        fs.rmSync(path.resolve(controllerQueriesPath, deprecated))
    }

    fs.writeFileSync(path.resolve(controllerQueriesPath, 'index.ts'), scaffoldedMethods.map(x => `export * from './${x}'`).join('\n'))

    const indexPath = path.resolve(projectRoot, `${config.coreFolder}${config.paths.queries}`, `${requiredEntity}`)
    fs.writeFileSync(path.resolve(indexPath, 'index.ts'), `export * as ${upperCase}Queries from './endpoints'`)
}



if (command === 'api-routes') {
    var [lowerCase, upperCase] = camelizeVariants(entityName)

    generateAPIRoutes(lowerCase, upperCase)
}

if (command === 'queries') {
    var [lowerCase, upperCase] = camelizeVariants(entityName)

    generateQueries(lowerCase, upperCase)
}

if (command.toLowerCase() === 'routes-with-queries' || command === 'rq') {
    const projectRoot = findProjectRoot()
    const controllersFolder = path.resolve(projectRoot, `${config.coreFolder}${config.paths.controllers}`)
    const controllerEntities = fs.readdirSync(controllersFolder, { withFileTypes: true }).filter(x => x.isDirectory()).map(x => x.name)
    for (const entity of controllerEntities) {
        var [lowerCase, upperCase] = camelizeVariants(entity)
        generateAPIRoutes(lowerCase, upperCase, entity)
        generateQueries(lowerCase, upperCase, entity)
    }
}

if (command.toLowerCase() === 'controller' || command === 'c') {
    var [lowerCase, upperCase] = camelizeVariants(entityName)
    generateController(upperCase, lowerCase)
    process.exit(0)
}

if (command.toLowerCase() === 'infrastructure' || command === 'i') {
    var [lowerCase, upperCase] = camelizeVariants(entityName)
    generateInfrastructure(upperCase, lowerCase)
    process.exit(0)

}

if (command.toLowerCase() === 'stored-entity' || command === 'se') {
    var [lowerCase, upperCase] = camelizeVariants(entityName)
    generateEntity(upperCase)
    generateStores(lowerCase, upperCase, true)
    process.exit(0)
}

if (command.toLowerCase() === 'crud-service') {
    var [lowerCase, upperCase] = camelizeVariants(entityName)
    generateEntity(upperCase)
    generateStores(lowerCase, upperCase, true)
    generateService(lowerCase, upperCase, upperCase + 'Store')
    process.exit(0)
}

if (command.toLowerCase() === 'crud-api') {
    var [lowerCase, upperCase] = camelizeVariants(entityName)
    generateEntity(upperCase)
    generateStores(lowerCase, upperCase, true)
    generateService(lowerCase, upperCase, upperCase + 'Store')
    generateController(upperCase, lowerCase, upperCase + 'Service')
    generateAPIRoutes(lowerCase, upperCase)
    generateQueries(lowerCase, upperCase)
    process.exit(0)
}

function generateWidget(name, rootPath) {
    const [lowerCase, upperCase] = camelizeVariants(name)

    const widgetsPath = config.paths.widgets
    const root = findProjectRoot()

    const folder = path.resolve(root, `${config.coreFolder}${widgetsPath}`, rootPath ?? '.', name)
    fs.mkdirSync(folder, { recursive: true })

    fs.writeFileSync(path.resolve(folder, `${name}.widget.tsx`), [
        `import { FC } from 'react'`,
        `import styles from './${lowerCase}.widget.module.css'`,
        ``,
        `export type ${upperCase}WidgetProps = {}`,
        ``,
        `export const ${upperCase}Widget: FC<${upperCase}WidgetProps> = ({ }) => {`,
        `\treturn undefined`,
        `}`
    ].join('\n'))

    fs.writeFileSync(path.resolve(folder, `${name}.widget.module.css`), [
       ''
    ].join('\n'))

    fs.writeFileSync(path.resolve(folder, `index.ts`), [
        `export * from './${name}.widget'`
    ].join('\n'))
}

if (command === 'w') {
    let rootPath = undefined
    if (entityName.includes('/')) {
        const splitData = entityName.split('/')
        entityName = splitData.pop()
        rootPath = splitData.join('/')
    }
    generateWidget(entityName, rootPath)
}

function generateLayoutedWidget(name, rootPath) {
    const [lowerCase, upperCase] = camelizeVariants(name)

    const widgetsPath = config.paths.widgets
    const root = findProjectRoot()

    const folder = path.resolve(root, `${config.coreFolder}${widgetsPath}`, rootPath ?? '.', name)
    fs.mkdirSync(folder, { recursive: true })

    fs.writeFileSync(path.resolve(folder, `${name}.headless-widget.tsx`), [
        `import { FC } from 'react'`,
        `import { ${upperCase}WidgetLayoutProps } from './${name}.widget-layout'`,
        ``,
        `export type ${upperCase}HeadlessWidgetProps = {`,
        `\tLayout: FC<${upperCase}WidgetLayoutProps>,`,
        ``,
        `export const ${upperCase}HeadlessWidget: FC<${upperCase}HeadlessWidgetProps> = ({ Layout }) => {`,
        `\treturn <Layout />`,
        `}`
    ].join('\n'))

    fs.writeFileSync(path.resolve(folder, `${name}.widget-layout.module.css`), [
       ''
    ].join('\n'))

    fs.writeFileSync(path.resolve(folder, `${name}.widget-layout.tsx`), [
        `import { FC } from 'react'`,
        `import styles from './${name}.widget-layout.module.css'`,
        ``,
        `export type ${upperCase}WidgetLayoutProps = {}`,
        ``,
        `export const ${upperCase}WidgetLayout: FC<${upperCase}WidgetLayoutProps> = ({}) => {`,
        `\treturn undefined`,
        `}`
    ].join('\n'))    

    fs.writeFileSync(path.resolve(folder, `${name}.widget.tsx`), [
        `import { FC } from 'react'`,
        `import { ${upperCase}HeadlessWidget, ${upperCase}HeadlessWidgetProps } from './${name}.headless-widget'`,
        `import { ${upperCase}WidgetLayout } from './${name}.widget-layout'`,
        ``,
        `export type ${upperCase}WidgetProps = Omit<${upperCase}HeadlessWidgetProps, 'Layout'>`,
        ``,
        `export const ${upperCase}Widget: FC<${upperCase}WidgetProps> = (props) => {`,
        `\treturn <${upperCase}HeadlessWidget Layout={${upperCase}WidgetLayout} {...props}/>`,
        `}`
    ].join('\n'))    

    fs.writeFileSync(path.resolve(folder, `index.ts`), [
        `export * from './${name}.widget'`
    ].join('\n'))
}


if (command === 'lw') {
    let rootPath = undefined
    if (entityName.includes('/')) {
        const splitData = entityName.split('/')
        entityName = splitData.pop()
        rootPath = splitData.join('/')
    }
    generateLayoutedWidget(entityName, rootPath)
}