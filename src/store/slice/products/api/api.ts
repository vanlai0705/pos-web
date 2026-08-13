import { userApiSlice } from '@/store/slice/api/base'
import { query } from '@/utils'
import { buildModelFormData } from '@/utils/multipart'
import type {
  TPosActiveProduct,
  TPosFilterData,
  TPosFilterParams,
  TPosProductPriceRow,
  TPosProductRecipeRow,
  TPosResponse,
  TPosShop
} from '@/store/slice/users/types'
export const productsApi = userApiSlice.injectEndpoints({
  endpoints: (builder) => ({
    // ─── Actives: Products ──────────────────────────────────────────────────

    filterActiveProducts: builder.query<
      TPosFilterData<TPosActiveProduct>,
      TPosFilterParams & { ProductGroupId?: number }
    >({
      query: (p) => ({
        url: `products/filter${query({ PageIndex: 0, PageSize: 15, ...p })}`,
      }),
      transformResponse: (
        res: TPosResponse<TPosFilterData<TPosActiveProduct>>,
      ) => res.Data ?? { Items: [], TotalItemCount: 0 },
    }),

    getActiveProductsSimple: builder.query<TPosActiveProduct[], void>({
      query: () => ({ url: "products/get-list-simple", method: "GET" }),
      transformResponse: (
        res: TPosResponse<
          TPosActiveProduct[] | TPosFilterData<TPosActiveProduct>
        >,
      ) => {
        const data = res.Data;
        return Array.isArray(data) ? data : (data?.Items ?? []);
      },
    }),

    getActiveProductDetail: builder.query<TPosActiveProduct, number>({
      query: (id) => ({ url: `products/detail?id=${id}` }),
      transformResponse: (res: TPosResponse<TPosActiveProduct>) => res.Data,
    }),

    updateActiveProductStatus: builder.mutation<
      void,
      { id: number; statusId: number }
    >({
      query: ({ id, statusId }) => ({
        url: `products/update-status?id=${id}&statusId=${statusId}`,
        method: "POST",
        body: {},
      }),
    }),

    saveActiveProduct: builder.mutation<
      TPosActiveProduct,
      { model: TPosActiveProduct; files: File[] }
    >({
      query: ({ model, files }) => ({
        url: model.Id ? "products/update" : "products/create",
        method: "POST",
        body: buildModelFormData(model, files),
      }),
      transformResponse: (res: TPosResponse<TPosActiveProduct>) => res.Data,
    }),

    /** Price tab — one row per price level (Bán lẻ/Bán buôn/…), Nhỏ/Vừa/Lớn columns. */
    getProductPrice: builder.query<TPosProductPriceRow[], number>({
      query: (productId) => ({
        url: `products/get-product-price?productId=${productId}`,
      }),
      transformResponse: (res: TPosResponse<TPosProductPriceRow[]>) =>
        res.Data ?? [],
    }),
    updateProductPrice: builder.mutation<
      void,
      { productId: number; priceList: TPosProductPriceRow[] }
    >({
      query: ({ productId, priceList }) => ({
        url: `products/update-product-price?productId=${productId}`,
        method: "POST",
        body: priceList,
      }),
    }),

    /** Định lượng tab — the BOM/ingredient list for a recipe product. */
    getProductRecipes: builder.query<TPosProductRecipeRow[], number>({
      query: (productId) => ({
        url: `product-recipes/get-list?productId=${productId}`,
      }),
      transformResponse: (res: TPosResponse<TPosProductRecipeRow[]>) =>
        res.Data ?? [],
    }),
    createProductRecipe: builder.mutation<
      void,
      { productId: number; body: unknown }
    >({
      query: ({ productId, body }) => ({
        url: `product-recipes/create?productId=${productId}`,
        method: "POST",
        body: buildModelFormData(body, []),
      }),
    }),
    deleteProductRecipe: builder.mutation<
      void,
      { productId: number; id: number }
    >({
      query: ({ productId, id }) => ({
        url: `product-recipes/delete?productId=${productId}&id=${id}`,
        method: "DELETE",
      }),
    }),

    /** Cửa hàng tab — lists every shop; the checkbox toggles that shop's own IsDefault flag (matches Angular's actual, product-agnostic behavior). */
    filterShopsAll: builder.query<TPosShop[], void>({
      query: () => ({
        url: `shop/filter${query({ PageIndex: 0, PageSize: 1000 })}`,
      }),
      transformResponse: (res: TPosResponse<TPosFilterData<TPosShop>>) =>
        res.Data?.Items ?? [],
    }),
    updateShop: builder.mutation<void, TPosShop>({
      query: (shop) => ({
        url: "shop/update",
        method: "POST",
        body: buildModelFormData(shop, []),
      }),
    }),
  }),
  overrideExisting: false,
});

export const {
  useFilterActiveProductsQuery,
  useLazyFilterActiveProductsQuery,
  useGetActiveProductsSimpleQuery,
  useLazyGetActiveProductsSimpleQuery,
  useGetActiveProductDetailQuery,
  useLazyGetActiveProductDetailQuery,
  useUpdateActiveProductStatusMutation,
  useSaveActiveProductMutation,
  useGetProductPriceQuery,
  useLazyGetProductPriceQuery,
  useUpdateProductPriceMutation,
  useGetProductRecipesQuery,
  useLazyGetProductRecipesQuery,
  useCreateProductRecipeMutation,
  useDeleteProductRecipeMutation,
  useFilterShopsAllQuery,
  useLazyFilterShopsAllQuery,
  useUpdateShopMutation
} = productsApi;
