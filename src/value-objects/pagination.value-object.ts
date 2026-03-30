import z from 'zod';

export type PaginationModel = z.infer<typeof Pagination.schema>;

export class Pagination {
    static schema = z.object({
        zeroBasedIndex: z.coerce.number().int().nonnegative(),
        pageSize: z.coerce.number().int().positive()
    });

    private constructor(private readonly data: PaginationModel) {}

    static create = (data: PaginationModel) => {
        const parsedModel = Pagination.schema.parse(data);
        return new Pagination(parsedModel);
    };

    get model(): PaginationModel {
        return this.data;
    }

    same = (pagination: Pagination) => {
        return (
            pagination.model.pageSize === this.model.pageSize &&
            pagination.model.zeroBasedIndex === this.model.zeroBasedIndex
        );
    };

    get nextPage() {
        return Pagination.create({
            pageSize: this.data.pageSize,
            zeroBasedIndex: this.data.zeroBasedIndex + 1
        });
    }

    /**
     * Safe implementation. If it's first page, pagination with the same model is returned.
     */
    get previousPage() {
        if (this.model.zeroBasedIndex === 0) {
            return Pagination.create(this.model);
        }

        return Pagination.create({
            pageSize: this.model.pageSize,
            zeroBasedIndex: this.model.zeroBasedIndex - 1
        });
    }

    get previousPage_UNSAFE() {
        return Pagination.create({
            pageSize: this.model.pageSize,
            zeroBasedIndex: this.model.zeroBasedIndex - 1
        });
    }
}
