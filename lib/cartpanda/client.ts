import type {
  CartPandaOrder,
  CartPandaProduct,
  OrdersListResponse,
  ProductsListResponse,
} from './types';
import { memoryCache, generateCacheKey } from '../cache';
import { apiLogger, cacheLogger } from '../logger';

const API_URL = process.env.NEXT_PUBLIC_CARTPANDA_API_URL || 'https://api.cartpanda.com/v3';
const API_TOKEN = process.env.CARTPANDA_API_TOKEN;
const STORE_NAME = process.env.CARTPANDA_STORE_NAME;

// Request timeout in milliseconds
const REQUEST_TIMEOUT = 300000; // 5 minutes (for bulk operations)

if (!API_TOKEN) {
  throw new Error('CARTPANDA_API_TOKEN is not defined in environment variables');
}

if (!STORE_NAME) {
  throw new Error('CARTPANDA_STORE_NAME is not defined in environment variables');
}

class CartPandaClient {
  private baseURL: string;
  private token: string;
  private storeName: string;

  constructor() {
    this.baseURL = API_URL;
    this.token = API_TOKEN!;
    this.storeName = STORE_NAME!;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {},
    useCache: boolean = false,
    cacheTTL: number = 5 * 60 * 1000
  ): Promise<T> {
    const url = `${this.baseURL}/${this.storeName}${endpoint}`;

    // Check cache if enabled
    if (useCache) {
      const cacheKey = generateCacheKey('api', { endpoint });
      const cached = memoryCache.get<T>(cacheKey);

      if (cached !== null) {
        cacheLogger.debug(`API Cache HIT: ${endpoint}`);
        return cached;
      }
    }

    apiLogger.debug(`CartPanda API request: ${url}`);

    const headers = {
      'Authorization': `Bearer ${this.token}`,
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      ...options.headers,
    };

    try {
      // Create abort controller for timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT);

      const response = await fetch(url, {
        ...options,
        headers,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          `CartPanda API Error: ${response.status} - ${
            errorData.message || response.statusText
          }`
        );
      }

      const data = await response.json();

      // Store in cache if enabled
      if (useCache) {
        const cacheKey = generateCacheKey('api', { endpoint });
        memoryCache.set(cacheKey, data, cacheTTL);
      }

      return data;
    } catch (error) {
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          throw new Error(`CartPanda API timeout after ${REQUEST_TIMEOUT}ms`);
        }
        throw error;
      }
      throw new Error('Unknown error occurred while fetching from CartPanda API');
    }
  }

  /**
   * Get list of orders
   * @param params Query parameters for filtering and pagination
   */
  async getOrders(params?: {
    page?: number;
    per_page?: number;
    status?: string;
    start_date?: string;
    end_date?: string;
  }): Promise<OrdersListResponse> {
    const queryParams = new URLSearchParams();

    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.per_page) queryParams.append('per_page', params.per_page.toString());
    if (params?.status) queryParams.append('status', params.status);
    if (params?.start_date) queryParams.append('start_date', params.start_date);
    if (params?.end_date) queryParams.append('end_date', params.end_date);

    const query = queryParams.toString();
    const endpoint = query ? `/orders?${query}` : '/orders';

    return this.request<OrdersListResponse>(endpoint);
  }

  /**
   * Get a single order by ID
   */
  async getOrder(orderId: string): Promise<CartPandaOrder> {
    return this.request<CartPandaOrder>(`/orders/${orderId}`);
  }

  /**
   * Get list of products
   */
  async getProducts(params?: {
    page?: number;
    per_page?: number;
  }): Promise<ProductsListResponse> {
    const queryParams = new URLSearchParams();

    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.per_page) queryParams.append('per_page', params.per_page.toString());

    const query = queryParams.toString();
    const endpoint = query ? `/products?${query}` : '/products';

    return this.request<ProductsListResponse>(endpoint);
  }

  /**
   * Get a single product by ID
   */
  async getProduct(productId: string): Promise<CartPandaProduct> {
    return this.request<CartPandaProduct>(`/products/${productId}`);
  }

  /**
   * Get orders from the last N days
   */
  async getRecentOrders(days: number = 30): Promise<CartPandaOrder[]> {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const response = await this.getOrders({
      start_date: startDate.toISOString().split('T')[0],
      end_date: endDate.toISOString().split('T')[0],
      per_page: 1000, // Get all orders in period
    });

    return response.orders;
  }

  /**
   * Get all orders with pagination handling
   */
  async getAllOrders(params?: {
    status?: string;
    start_date?: string;
    end_date?: string;
    maxPages?: number; // Optional limit for pagination
  }): Promise<CartPandaOrder[]> {
    const allOrders: CartPandaOrder[] = [];
    const seenOrderIds = new Set<number>();
    let currentPage = 1;
    let hasMore = true;
    let totalPages: number | null = null;
    // Default to 200 pages (~10,000 orders = 12+ months) for complete historical sync
    // Can be overridden with maxPages parameter
    const MAX_PAGES = params?.maxPages || 200;
    const MAX_DUPLICATE_PAGES = 3; // Stop after N consecutive pages with all duplicates
    let consecutiveDuplicatePages = 0;

    apiLogger.debug(`Fetching orders (limit: ${MAX_PAGES} pages = ~${MAX_PAGES * 50} orders)`);

    while (hasMore) {
      const response = await this.getOrders({
        ...params,
        page: currentPage,
        per_page: 100,
      });

      const ordersInPage = response.orders.length;

      // Get total pages from API response (first page only)
      if (currentPage === 1 && response.meta?.total_pages) {
        totalPages = response.meta.total_pages;
        apiLogger.debug(`Total pages reported by API: ${totalPages}`);
      }

      // Check for duplicate orders (API is looping)
      let newOrdersInPage = 0;
      for (const order of response.orders) {
        if (!seenOrderIds.has(order.id)) {
          seenOrderIds.add(order.id);
          allOrders.push(order);
          newOrdersInPage++;
        }
      }

      apiLogger.debug(
        `Page ${currentPage}: ${ordersInPage} orders (${newOrdersInPage} new, ${ordersInPage - newOrdersInPage} duplicates) - Total unique: ${allOrders.length}`
      );

      // Track consecutive pages with all duplicates
      if (newOrdersInPage === 0) {
        consecutiveDuplicatePages++;
      } else {
        consecutiveDuplicatePages = 0;
      }

      // Stop conditions:
      // 1. No orders returned
      // 2. All orders are duplicates for N consecutive pages
      // 3. Reached total_pages from API
      // 4. Safety limit reached
      if (ordersInPage === 0) {
        hasMore = false;
        apiLogger.debug('Stopping: no orders returned');
      } else if (consecutiveDuplicatePages >= MAX_DUPLICATE_PAGES) {
        hasMore = false;
        apiLogger.debug(`Stopping: ${MAX_DUPLICATE_PAGES} consecutive pages with only duplicates`);
      } else if (totalPages && currentPage >= totalPages) {
        hasMore = false;
        apiLogger.debug(`Stopping: reached total pages (${totalPages})`);
      } else if (currentPage >= MAX_PAGES) {
        hasMore = false;
        apiLogger.warn(`Stopping: reached safety limit (${MAX_PAGES} pages)`);
      }

      currentPage++;
    }

    apiLogger.info(`Pagination complete: ${allOrders.length} unique orders in ${currentPage - 1} pages`);

    return allOrders;
  }
}

// Export singleton instance
export const cartPandaClient = new CartPandaClient();

// Export class for testing
export { CartPandaClient };
