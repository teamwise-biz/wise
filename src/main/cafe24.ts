import axios from 'axios';

// Cache for access tokens
const tokenCache: { [mallId: string]: { token: string; expiresAt: number } } = {};

/**
 * Request an Access Token from our Next.js SaaS Backend.
 * The backend manages the Client ID, Secret, and Refresh Tokens securely.
 */
export async function getCafe24Token(mallId: string): Promise<string> {
  const now = Date.now();
  if (tokenCache[mallId] && tokenCache[mallId].expiresAt > now + 60000) {
    return tokenCache[mallId].token;
  }

  try {
    // URL fallback for dev or prod Next.js server
    const serverUrl = process.env.WISE_WEB_URL || 'https://wise-web.vercel.app';
    const response = await axios.post(`${serverUrl}/api/market/cafe24/token`, {
      mallId,
    });

    if (response.data && response.data.access_token) {
      const token = response.data.access_token;
      // Expires roughly in 2 hours, but server handles refresh. Let's cache locally for 1 hr.
      tokenCache[mallId] = {
        token,
        expiresAt: now + (3600 * 1000)
      };
      return token;
    } else {
      throw new Error(response.data.error || 'Token fetch failed');
    }
  } catch (error: unknown) {
    const err = error as any;
    console.error('Cafe24 백엔드 연동 토큰 갱신 실패:', err?.response?.data || err.message);
    throw new Error('카페24 API 토큰 갱신 여부를 확인해 주세요. [1클릭 연동] 버튼을 다시 눌러주세요.');
  }
}

export interface Cafe24ProductPayload {
  shop_no: number;
  request: {
    display_state: 'T' | 'F';
    selling_state: 'T' | 'F';
    product_name: string;
    price: string | number;
    retail_price: string | number;
    supply_price: string | number;
    summary_description: string;
    simple_description: string;
    description: string;
    detail_image: string; // URL
    custom_product_code: string; // Our master DB ItemCode
    origin_classification: string;
    origin_place_no: number;
    // Categorization
    category?: { category_no: number; recommend: 'T' | 'F'; new: 'T' | 'F' }[];
    // Options
    has_option: 'T' | 'F';
    shipping_fee_type: 'T' | 'R' | 'F' | 'M' | 'D' | 'W';
    shipping_fee?: string | number;
  };
}

export async function createCafe24Product(
  mallId: string,
  payload: Cafe24ProductPayload
) {
  const token = await getCafe24Token(mallId);

  try {
    const response = await axios.post(
      `https://${mallId}.cafe24api.com/api/v2/admin/products`,
      payload,
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'X-Cafe24-Api-Version': '2024-03-01'
        }
      }
    );

    return {
      success: true,
      productNo: response.data.product?.product_no
    };
  } catch (error: unknown) {
    const err = error as any;
    console.error('Cafe24 상품 등록 실패:', err?.response?.data || err.message);
    return {
      success: false,
      error: err?.response?.data?.error?.message || err.message
    };
  }
}

export async function updateCafe24Product(
  mallId: string,
  productNo: number,
  payload: Partial<Cafe24ProductPayload>
) {
  const token = await getCafe24Token(mallId);

  try {
    const response = await axios.put(
      `https://${mallId}.cafe24api.com/api/v2/admin/products/${productNo}`,
      payload,
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'X-Cafe24-Api-Version': '2024-03-01'
        }
      }
    );

    return {
      success: true,
      productNo: response.data.product?.product_no
    };
  } catch (error: unknown) {
    const err = error as any;
    console.error(`Cafe24 상품(${productNo}) 업데이트 실패:`, err?.response?.data || err.message);
    return {
      success: false,
      error: err?.response?.data?.error?.message || err.message
    };
  }
}

export async function deleteCafe24Product(
  mallId: string,
  productNo: number
) {
  const token = await getCafe24Token(mallId);

  try {
    await axios.delete(
      `https://${mallId}.cafe24api.com/api/v2/admin/products/${productNo}`,
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'X-Cafe24-Api-Version': '2024-03-01'
        }
      }
    );

    return {
      success: true
    };
  } catch (error: unknown) {
    const err = error as any;
    console.error(`Cafe24 상품(${productNo}) 삭제 실패:`, err?.response?.data || err.message);
    return {
      success: false,
      error: err?.response?.data?.error?.message || err.message
    };
  }
}
