import axios from 'axios';
// eslint-disable-next-line @typescript-eslint/no-require-imports
const cheerio = require('cheerio');
// eslint-disable-next-line @typescript-eslint/no-require-imports
const iconv = require('iconv-lite');

export async function scrapeDometopiaProduct(url: string, cookie?: string | null) {
    try {
        const headers: any = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8'
        };
        
        if (cookie) {
            headers['Cookie'] = cookie;
        }

        // Dometopia mostly uses EUC-KR encoding, so we need to fetch as arraybuffer and decode
        const response = await axios.get(url, {
            responseType: 'arraybuffer',
            headers
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
            
            // 불필요 스크립트 등 제거
            $spec.find('script, link, style').remove();
            
            // --- 가독성 개선 및 모바일 화질 최적화 (Sanitization & Responsive styling) ---
            
            // 1. 구형 레이아웃 속성 싹쓸이 (인라인 스타일, 클래스와 정렬 제거)
            $spec.find('*').removeAttr('style').removeAttr('class').removeAttr('width').removeAttr('height').removeAttr('border').removeAttr('bgcolor').removeAttr('align').removeAttr('valign').removeAttr('id');
            
            // 2. <font>, <span> 등의 텍스트 꾸밈 무의미한 태그만 텍스트로 보존하며 날리기 (div는 레이아웃을 위해 보존)
            $spec.find('font, span').each((_i, el) => {
                $(el).replaceWith($(el).html() || '');
            });

            // 3. 이미지 모바일 반응형 처리 (가로폭 100% 넘지 않게 중앙 정렬) 및 공통 배너 삭제
            $spec.find('img').each((_i, el) => {
                const src = $(el).attr('src') || '';
                if (src.includes('all_top_img') || src.includes('gtd_title') || src.includes('top_ban')) {
                    $(el).remove();
                } else {
                    $(el).attr('style', 'max-width: 100%; height: auto; display: block; margin: 20px auto; border-radius: 8px;');
                }
            });

            // 4. 고정폭 Table 모바일 반응형 및 깔끔한 회색톤 UI 적용
            $spec.find('table').each((_i, el) => {
                $(el).before('<div style="overflow-x: auto; margin: 30px 0;">');
                $(el).attr('style', 'width: 100%; min-width: 300px; max-width: 100%; border-collapse: collapse; font-size: 14px; color: #444; text-align: left; border-top: 2px solid #333;');
            });
            $spec.find('th, td').each((_i, el) => {
                $(el).attr('style', 'border-bottom: 1px solid #eee; padding: 12px 15px; line-height: 1.6; word-break: keep-all; vertical-align: top;');
            });
            $spec.find('th').each((_i, el) => {
                 const currentStyle = $(el).attr('style') || '';
                 $(el).attr('style', currentStyle + ' background-color: #f9f9fa; font-weight: bold; width: 30%; color: #222;');
            });
            $spec.find('table').each((_i, el) => {
                $(el).after('</div>'); // 테이블 스크롤용 div 닫기 (Cheerio 렌더링 특성상 구조 보정 필요할 수 있음)
            });

            // 5. 남은 텍스트 요소들(p, div 등) 가독성 극대화 (줄간격, 폰트사이즈, 텍스트 중앙정렬)
            $spec.find('p, div').each((_i, el) => {
                // 이미지가 포함된 div/p이면 굳이 스타일 안먹임
                if ($(el).find('img').length === 0 && $(el).text().trim() !== '') {
                    $(el).attr('style', 'line-height: 1.8; color: #222; word-break: keep-all; font-size: 16px; margin: 15px auto; text-align: center; max-width: 800px; padding: 0 15px;');
                }
            });

            let cleanHtml = $spec.html() || '';
            
            // 6. 무의미한 빈칸이나 줄바꿈 떡칠 삭제 (Regex 가공)
            cleanHtml = cleanHtml.replace(/<p[^>]*>\s*<\/p>/g, '') // 빈 p 태그
                                 .replace(/<div[^>]*>\s*<\/div>/g, '') // 빈 div 태그
                                 .replace(/<br\s*\/?>\s*<br\s*\/?>+/gi, '<br><br>') // 3개 이상의 br을 2개로 압축
                                 .replace(/&nbsp;/g, ' ') // 하드 공백 일반 공백화
                                 .replace(/>\s+</g, '><'); // 태그 사이 공백 축소
            
            detailHtml = `<div style="font-family: 'Malgun Gothic', 'Apple SD Gothic Neo', sans-serif; background-color: #fff; padding: 20px 0;">${cleanHtml}</div>`;
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
            detailHtml = '<p style="text-align: center; color: #666; font-size: 14px; padding: 50px 0;">상세설명 참조</p>';
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

        // --- KC 인증 정보 (KC Certification) 파싱 ---
        let kcCertification = '';
        $spec.find('p, div, span').each((_i, el) => {
             const text = $(el).text().replace(/\s+/g, ' ').trim();
             // 정규식으로 안전인증번호(전기용품, 어린이용품 등) 추출
             // 예: CB061Rxxxx-xxxx, R-R-xxx-xxxx, HU07xxxx-xxxx, SU07xxxx-xxxx, B052Rxxx-xxxx 등
             const kcMatch = text.match(/([A-Z]{2,3}[0-9]{4,5}[A-Z]?[0-9]*-[0-9A-Za-z]+|R-[A-Z]-[a-zA-Z0-9]+-[a-zA-Z0-9]+|CB[0-9]{2}[A-Za-z][0-9]+-[0-9]+|SU[0-9]{2}[A-Za-z][0-9]+-[0-9]+)/);
             if (kcMatch) {
                 kcCertification = kcMatch[1];
             } else if (text.includes('KC마크') || text.includes('인증번호')) {
                 // 좀 더 넓은 패턴
                 const broadMatch = text.match(/([A-Z0-9]+-[A-Z0-9]+-[A-Z0-9]+)/);
                 if (broadMatch && !broadMatch[1].startsWith('010')) {
                     kcCertification = broadMatch[1];
                 }
             }
        });

        // HTML 본문(문자열 전체)에서 fallback 검색
        if (!kcCertification) {
             const htmlText = $.html() || '';
             const htmMatch = htmlText.match(/([A-Z]{2,3}[0-9]{4,5}[A-Z]?[0-9]*-[0-9A-Za-z]+|R-[A-Z]-[a-zA-Z0-9]+-[a-zA-Z0-9]+)/);
             if (htmMatch) {
                 kcCertification = htmMatch[1];
             }
        }

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
                kcCertification,
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
export async function scrapeCategoryLinks(baseUrl: string, cookie?: string | null): Promise<{ success: boolean, links?: string[], error?: string }> {
    try {
        const linksSet = new Set<string>();
        let page = 1;
        const maxPages = 10;
        
        const headers: any = {
             'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        };
        if (cookie) {
             headers['Cookie'] = cookie;
        }

        while (page <= maxPages) {
            // URL에 이미 파라미터가 있는지 확인하고 page 파라미터 추가
            const urlSeparator = baseUrl.includes('?') ? '&' : '?';
            const pageUrl = `${baseUrl}${urlSeparator}page=${page}`;
            
            const response = await axios.get(pageUrl, {
                responseType: 'arraybuffer',
                headers
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

/**
 * 도매토피아 상품의 현재 상태(단종/품절 여부 및 가격)를 빠르게 확인하는 경량 스크래퍼 기능
 * 모니터링 씽크 작업 시 이미지나 상세설명 파싱을 생략하여 속도를 높입니다.
 * @param itemCode 도매토피아 상품 코드
 * @param cookie 도매회원 인가를 위한 세션 쿠키
 * @returns 상태 (단종 여부, 현재 가격)
 */
export async function checkDometopiaStatus(itemCode: string, cookie?: string | null): Promise<{ isOutOfStock: boolean, currentPrice?: number, error?: string }> {
    try {
        const url = `https://dometopia.com/goods/view?no=${itemCode}`;
        const headers: any = {
             'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        };
        if (cookie) headers['Cookie'] = cookie;

        // axios defaults to throwing on 4xx/5xx responses
        // We catch them down below. But Dometopia might return 200 with an alert script instead of 404.
        const response = await axios.get(url, {
            responseType: 'arraybuffer',
            headers,
            // don't follow redirects automatically if we want to catch "deleted" items redirecting to home
            maxRedirects: 0,
            validateStatus: (status) => status >= 200 && status < 303 // accept 301/302 as well to inspect them
        });

        // If it redirected, it might be heavily deleted or invalid
        if (response.status === 301 || response.status === 302) {
             return { isOutOfStock: true };
        }

        let html = iconv.decode(response.data, 'EUC-KR');
        if (html.includes('utf-8') || html.includes('UTF-8')) {
            html = iconv.decode(response.data, 'UTF-8');
        }

        // Domain-specific deleted/out-of-stock check
        // "없는 상품입니다" or "판매중지된 상품입니다" alert might be in the html
        if (html.includes('없는 상품입니다') || html.includes('판매중지된') || html.includes('location.replace')) {
            // A common pattern is `<script>alert('...'); history.back();</script>`
            if (html.includes('alert(') && (html.includes('history.back') || html.includes('location.href'))) {
                return { isOutOfStock: true };
            }
        }

        const $ = cheerio.load(html);

        // Price check
        let rawPrice = $('input[name="multi_discount_fifty"]').val() as string ||
                       $('.optionPrice').first().text().trim();
                       
        if (!rawPrice) {
            const priceMatch = html.match(/var\s+productPrice\s*=\s*['"]([^'"]+)['"]/);
            if (priceMatch) rawPrice = priceMatch[1].trim();
        }
        
        let salePrice = 0;
        if (rawPrice) {
             salePrice = parseInt(rawPrice.replace(/[^0-9]/g, ''), 10);
        }

        // If we still can't find a price and there is no product name, it might be out of stock
        const name = $('.pl_name h2').first().text().trim() || $('.pl_name h3').first().text().trim();
        if (!name && salePrice === 0) {
             return { isOutOfStock: true };
        }

        return {
             isOutOfStock: false,
             currentPrice: salePrice
        };

    } catch (error: any) {
        // Axios throws an error for 404 statuses
        if (error.response && error.response.status === 404) {
             return { isOutOfStock: true };
        }
        return { isOutOfStock: false, error: error?.message || String(error) };
    }
}

