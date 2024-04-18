import { PaginationTypeEnum, paginate } from "nestjs-typeorm-paginate";
import { SelectQueryBuilder } from "typeorm";

export async function paginateData<T>(
  page: number,
  limit: number,
  queryBuilder: SelectQueryBuilder<T>,
  isCsv = false,
  countQueries = true
) {
  if(isCsv) {
    const data = await queryBuilder.getMany()

    return {
      items: data,
      meta: {
        currentPage: 0,
        itemCount: 0,
        itemsPerPage: 0,
        totalItems: 0,
        totalPages: 0,
      }
    }
  }

  const data = await paginate(queryBuilder, {
    page,
    limit,
    paginationType: PaginationTypeEnum.TAKE_AND_SKIP,
    countQueries,
    metaTransformer: ({ currentPage, itemCount, itemsPerPage, totalItems }) => {
      const totalPages = Math.ceil(totalItems / itemsPerPage);
      return {
        currentPage,
        itemCount,
        itemsPerPage,
        totalItems,
        totalPages: totalPages === 0 ? 1 : totalPages,
      };
    },
  });

  return data;
}
