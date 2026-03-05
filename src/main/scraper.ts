import axios from 'axios';
// eslint-disable-next-line @typescript-eslint/no-require-imports
const cheerio = require('cheerio');
// eslint-disable-next-line @typescript-eslint/no-require-imports
const iconv = require('iconv-lite');

export async function scrapeDometopiaProduct(url: string) {
    try {
        // Dometopia mostly uses EUC-KR encoding, so we need to fetch as arraybuffer and decode
        const response = await axios.get(url, {
            responseType: 'arraybuffer',
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8'
            }
        });

        // Try decoding as EUC-KR first (standard for legacy Korean malls)
        let html = iconv.decode(response.data, 'EUC-KR');
        let $ = cheerio.load(html);

        // Fallback to UTF-8 if we detect it's not EUC-KR (or you can check response headers)
        if (html.includes('utf-8') || html.includes('UTF-8')) {
           html = iconv.decode(response.data, 'UTF-8');
           $ = cheerio.load(html);
        }

        // --- Selective Scraping Logic for Dometopia ---
        
        // Name: Dometopia usually puts the name in a <div class="pl_name"><h2> or <h3>
        // Or in a javascript block: var productName = "...";
        let name = $('.pl_name h2').first().text().trim() || 
                   $('.pl_name h3').first().text().trim() || 
                   $('title').text().replace('도매토피아 -', '').trim();
                   
        // Regex fallback for name
        if (!name || name.includes('대한민국 최대')) {
            const nameMatch = html.match(/var\s+productName\s*=\s*['"]([^'"]+)['"]/);
            if (nameMatch) name = nameMatch[1].trim();
        }
        
        // Price: usually in a hidden input for discounts or javascript var
        let rawPrice = $('input[name="multi_discount_fifty"]').val() as string ||
                       $('.optionPrice').first().text().trim();
                       
        // Regex fallback for price
        if (!rawPrice) {
            const priceMatch = html.match(/var\s+productPrice\s*=\s*['"]([^'"]+)['"]/);
            if (priceMatch) rawPrice = priceMatch[1].trim();
        }
        
        const salePrice = parseInt(rawPrice ? rawPrice.replace(/[^0-9]/g, '') : '0', 10);

        // Images: The main slider image
        let mainImageSrc = $('#goods_thumbs .slides_container img').first().attr('src') || '';
        
        // Fallback to og:image if the slider wasn't found (and not the generic one)
        if (!mainImageSrc) {
             const og = $('meta[property="og:image"]').attr('content') || '';
             if (!og.includes('meta_property')) mainImageSrc = og;
        }

        const mainImageUrl = mainImageSrc.startsWith('http') ? mainImageSrc : (mainImageSrc ? `https://dometopia.com${mainImageSrc}` : '');

        // Detail HTML (For smartstore detailContent)
        // Usually inside a div with id="goods_spec" or class="goods_spec" or class="goods_description"
        const $spec = $('#goods_spec').length ? $('#goods_spec') : 
                      ($('.goods_spec').length ? $('.goods_spec') : $('.goods_description'));
        
        let detailHtml = '';
        
        if ($spec.length) {
            // 네이버 스마트스토어 규격에 맞게 상세설명 내 이미지 경로 절대경로화
            $spec.find('img').each((_i, el) => {
                const src = $(el).attr('src');
                if (src && !src.startsWith('http')) {
                    $(el).attr('src', src.startsWith('/') ? `https://dometopia.com${src}` : `https://dometopia.com/${src}`);
                }
            });
            
            // 네이버는 iframe 등록을 막으므로, 유튜브 등 영상은 텍스트 링크로 변환
            $spec.find('iframe').each((_i, el) => {
                const src = $(el).attr('src');
                if (src && (src.includes('youtube.com') || src.includes('youtu.be'))) {
                    $(el).replaceWith(`<p><a href="${src}" target="_blank" style="font-size:16px; font-weight:bold; color:blue;">▶ 상품 소개 영상 보기 (클릭)</a></p>`);
                } else {
                    $(el).remove();
                }
            });
            
            // 불필요 태그 제거
            $spec.find('script, link, style').remove();
            
            detailHtml = $spec.html() || '';
        }

        // 보완 로직: 만약 $spec 을 못 찾았거나, 내용이 부실하다면 구체적인 이미지 태그 직접 탐색
        // 예: <img src="/data/goods/goods_img/GDI/1358506/1358506.jpg" alt="상품상세">
        // 인코딩 문제로 alt="상품상세" 매칭이 실패할 수 있으므로 src 경로 패턴으로 가져옵니다.
        const detailImages = $('img[src*="/data/goods/goods_img/"]');
        if (detailImages.length > 0) {
            let backupHtml = '';
            detailImages.each((_i, el) => {
                 let src = $(el).attr('src');
                 // 상단 공통 배너 이미지는 제외 (예: all_top_img.jpg)
                 if (src && !src.includes('all_top_img')) {
                     let canonicalSrc = src;
                     if (!canonicalSrc.startsWith('http')) {
                         canonicalSrc = canonicalSrc.startsWith('/') ? `https://dometopia.com${canonicalSrc}` : `https://dometopia.com/${canonicalSrc}`;
                     }
                     
                     // 이미 detailHtml 내부에 해당 이미지 URL이 포함되어 있다면 중복 추가하지 않음
                     if (!detailHtml.includes(src) && !detailHtml.includes(canonicalSrc)) {
                         backupHtml += `<p style="text-align: center;"><img src="${canonicalSrc}" alt="상품상세"></p>`;
                     }
                 }
            });
            
            // 추가할 이미지가 존재한다면 기존 HTML 상단에 병합
            if (backupHtml) {
                 detailHtml = backupHtml + detailHtml;
            }
        }

        // 그래도 내용이 아무것도 없다면 기본 제공고시 표시
        if (!detailHtml || detailHtml.trim() === '') {
            detailHtml = '<p>상세설명 참조</p>';
        }

        // --- 배송비(Delivery Fee) 파싱 ---
        let baseDeliveryFee = 2500; // 기본 배송비 하드코딩 탈피용 폴백
        let freeConditionAmount = 0; // 조건부 무료 기준액 (0이면 유료배송 전용)

        // 1. 배송비 라벨(th 등) 근처의 텍스트 탐색
        $('th, td, dt, dd, span').each((_i, el) => {
            const text = $(el).text().replace(/\s+/g, ' ').trim();
            if (text.includes('배송비') && text.length < 50) {
                const tagName = $(el).prop('tagName');
                if (tagName && tagName.toLowerCase() === 'th') {
                    const sibling = $(el).next('td');
                    if (sibling.length) {
                        const siblingVal = sibling.text().replace(/\s+/g, ' ').trim();
                        // 형태 ex: "150,000원 이상 무료 미만 2,500원 2,500원 착불"
                        
                        // 정규식 파싱 시도 (숫자만 발라냄)
                        const freeMatch = siblingVal.match(/([0-9,]+)원\s*이상\s*무료/);
                        if (freeMatch) {
                            freeConditionAmount = parseInt(freeMatch[1].replace(/,/g, ''), 10);
                        }

                        const feeMatch = siblingVal.match(/미만\s*([0-9,]+)원/);
                        if (feeMatch) {
                            baseDeliveryFee = parseInt(feeMatch[1].replace(/,/g, ''), 10);
                        } else {
                             // "미만 n원" 형태가 없고 단순히 "3,000원"이라고 적힌 경우
                             const simpleFee = siblingVal.match(/([0-9,]+)원/);
                             if (simpleFee) baseDeliveryFee = parseInt(simpleFee[1].replace(/,/g, ''), 10);
                        }
                    }
                }
            }
        });

        // --- 메타정보(제조사, 원산지, 재질 등) 파싱 ---
        let manufacturer = '자체제작';
        let origin = '아시아/중국'; // 기본값
        let material = '';
        let modelName = '';

        $('table th').each((_i, el) => {
            const thText = $(el).text().replace(/\s+/g, ' ').trim();
            const tdText = $(el).next('td').text().replace(/\s+/g, ' ').trim();
            
            if (thText.includes('제조자') || thText.includes('수입자')) {
                manufacturer = tdText && tdText !== '별도표기' ? tdText : manufacturer;
            } else if (thText.includes('제조국') || thText.includes('원산지')) {
                origin = tdText && tdText !== '별도표기' ? tdText : origin;
            } else if (thText.includes('상품재질') || thText.includes('소재')) {
                material = tdText;
            } else if (thText.includes('품목') || thText.includes('모델명')) {
                modelName = tdText;
            }
        });

        // --- 카테고리(Category Path) 파싱 ---
        // 도매토피아는 UI 상에 경로가 명시되지 않으므로(단순 코드만 존재) meta keywords 스팬을 파싱.
        // ex: <meta name="keywords" content="주방용품 > 보관/밀폐용기 > 보온/보냉병 델데이 데이보틀, 텀블러, ...">
        const categoryPath: string[] = [];
        const keywordsMeta = $('meta[name="keywords"]').attr('content') || '';
        if (keywordsMeta.includes('>')) {
            const firstBlock = keywordsMeta.split(',')[0]; // 첫 번째 콤마 덩어리 전까지
            const parts = firstBlock.split('>');
            
            parts.forEach((p, index) => {
                let cleanPart = p.trim();
                // 마지막 파싱 단계(말단 카테고리)에는 상품명이 따라붙으므로 분리 (ex: "보온/보냉병 델데이...")
                if (index === parts.length - 1 && cleanPart.includes(' ')) {
                    cleanPart = cleanPart.split(' ')[0]; 
                }
                if (cleanPart && cleanPart !== '홈' && cleanPart !== 'HOME') {
                    categoryPath.push(cleanPart);
                }
            });
        }
        
        // 만약 위에서 못 찾았다면 상품분류명(옵션) 주변에서 찾기 시도
        if (categoryPath.length === 0) {
            $('select[name="category"] option:selected').each((_i, el) => {
                const text = $(el).text().trim();
                // "생활/가전 > 주방용품 > 컵" 형태로 된 텍스트일 수 있음
                if (text && !text.includes('카테고리 선택')) {
                    const parts = text.split('>');
                    parts.forEach(p => categoryPath.push(p.trim()));
                }
            });
        }

        return {
            success: true,
            data: {
                name,
                salePrice,
                mainImageUrl,
                detailHtml,
                deliveryFee: baseDeliveryFee,
                freeCondition: freeConditionAmount,
                rawUrl: url,
                // 신규 추가된 메타데이터 플래그
                manufacturer,
                origin,
                material,
                modelName,
                // 스마트 매핑을 위한 전체 카테고리 경로
                categoryPath
            }
        };

    } catch (error: any) {
        throw new Error(`Failed to scrape Dometopia: ${error?.message || String(error)}`);
    }
}

/**
 * 도매토피아 카테고리/검색 페이지를 파싱하여, 페이지 내부의 모든 상품 상세 URL들을 추출합니다.
 * 최대 10페이지까지 자동으로 순회합니다.
 * @param baseUrl 카테고리/검색 베이스 URL
 * @returns 상품 상세 URL들의 배열
 */
export async function scrapeCategoryLinks(baseUrl: string): Promise<{ success: boolean, links?: string[], error?: string }> {
    try {
        const linksSet = new Set<string>();
        let page = 1;
        const maxPages = 10;
        
        while (page <= maxPages) {
            // URL에 이미 파라미터가 있는지 확인하고 page 파라미터 추가
            const urlSeparator = baseUrl.includes('?') ? '&' : '?';
            const pageUrl = `${baseUrl}${urlSeparator}page=${page}`;
            
            const response = await axios.get(pageUrl, {
                responseType: 'arraybuffer'
            });

            // EUC-KR 디코딩
            let html = iconv.decode(response.data, 'EUC-KR');
            if (html.includes('utf-8') || html.includes('UTF-8')) {
                html = iconv.decode(response.data, 'UTF-8');
            }
            
            const $ = cheerio.load(html);
            let addedCount = 0;

            $('a[href*="/goods/view?no="]').each((_i, el) => {
                const href = $(el).attr('href');
                if (href) {
                    const cleanHref = href.split('&')[0];
                    const fullUrl = cleanHref.startsWith('http') ? cleanHref : `https://dometopia.com${cleanHref.startsWith('/') ? cleanHref : '/' + cleanHref}`;
                    if (!linksSet.has(fullUrl)) {
                        linksSet.add(fullUrl);
                        addedCount++;
                    }
                }
            });

            // 해당 페이지에서 새로 추가된 상품 링크가 더 이상 없으면 페이지네이션 종료
            if (addedCount === 0) {
                break;
            }
            
            page++;
        }

        return {
            success: true,
            links: Array.from(linksSet)
        };
    } catch (error: any) {
        throw new Error(`Failed to scrape category links: ${error?.message || String(error)}`);
    }
}
