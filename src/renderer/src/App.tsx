import * as React from 'react'
import { useState, useRef } from 'react'
import { Stepper, StepInfo } from './components/Stepper';
import { ActionLogs } from './components/ActionLogs';
import { DataPrepStep, ScrapeMethod } from './components/steps/DataPrepStep';
import { MarketSyncStep } from './components/steps/MarketSyncStep';

type SyncStatus = 'pending' | 'syncing' | 'success' | 'failed'

const WIZARD_STEPS: StepInfo[] = [
  { id: 1, label: '데이터 준비 (엑셀)' },
  { id: 2, label: '마켓 연동 (스토어 관리)' },
];


function App(): React.JSX.Element {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [logs, setLogs] = useState<string[]>([])
  const [sheetId, setSheetId] = useState<string | null>(null)
  const [sheetData, setSheetData] = useState<string[][]>([])
  const [scrapeMethod, setScrapeMethod] = useState<ScrapeMethod>('product');
  const [scrapeQuery, setScrapeQuery] = useState<string>('183521');
  const [syncStatuses, setSyncStatuses] = useState<{ [rowIdx: number]: { status: SyncStatus, message: string } }>({})

  const [isScraping, setIsScraping] = useState<boolean>(false);
  const cancelScrapeRef = useRef<boolean>(false);

  // Phase 4 Pricing States
  const [marginRate, setMarginRate] = useState<number>(20);
  const [extraShippingCost, setExtraShippingCost] = useState<number>(0);

  // Wizard State
  const [currentStep, setCurrentStep] = useState<number>(1);


  const [masterSheetId, setMasterSheetId] = useState<string>('');

  const addLog = (message: string) => {
    setLogs((prev) => [...prev, message])
  }

  const handleScrape = async () => {
    if (!scrapeQuery.trim()) {
      addLog('에러: 상품번호, 카테고리 코드 또는 검색어를 입력해주세요.')
      return
    }
    if (!sheetId) {
      addLog('에러: 데이터를 저장할 시트가 필요합니다. 1단계에서 [테스트 시트 생성]을 먼저 진행해주세요.')
      return
    }

    setIsScraping(true);
    cancelScrapeRef.current = false;

    let urlsToScrape: string[] = [];

    if (scrapeMethod === 'product') {
      const productIds = scrapeQuery
        .split('\n')
        .map(id => id.trim())
        .filter(id => id.length > 0);

      if (productIds.length === 0) {
        addLog('에러: 상품번호를 올바르게 입력해주세요.');
        return;
      }
      urlsToScrape = productIds.map(id => `https://dometopia.com/goods/view?no=${id}`);
      addLog(`입력된 상품번호 ${productIds.length}개로 파싱 완료.`);
    } else {
      let linkUrl = '';
      if (scrapeMethod === 'category') {
        // Handle full URL or just category code.
        const code = scrapeQuery.trim();
        linkUrl = code.startsWith('http') ? code : `https://dometopia.com/goods/catalog?code=${code}`;
      } else if (scrapeMethod === 'search') {
        linkUrl = `https://dometopia.com/goods/search?search_text=${encodeURIComponent(scrapeQuery.trim())}`;
      }

      addLog(`[${scrapeMethod === 'category' ? '카테고리' : '검색결과'}] 최대 10페이지에 걸쳐 대량 상품 링크 추출 중... (잠시만 기다려주세요)`);
      try {
        const linkRes = await window.electron.ipcRenderer.invoke('scrape-category', linkUrl);
        if (linkRes.success && linkRes.links && linkRes.links.length > 0) {
          urlsToScrape = linkRes.links;
          addLog(`🎉 총 ${linkRes.links.length}개의 상품 링크를 성공적으로 추출했습니다!`);
        } else {
          addLog(`❌ 상품 링크를 찾을 수 없습니다: ${linkRes.error || '0 links found'}`);
          return;
        }
      } catch (err: unknown) {
        const errorMsg = err instanceof Error ? err.message : String(err);
        addLog(`❌ 링크 추출 중 오류 발생: ${errorMsg}`);
        setIsScraping(false);
        return;
      }
    }

    if (urlsToScrape.length === 0) {
      setIsScraping(false);
      return;
    }

    addLog(`총 ${urlsToScrape.length}개의 상품 수집을 시작합니다...`);

    // Fetch nextRow once to append continuously
    let nextRow = 2;
    try {
      const readRes = await window.electron.ipcRenderer.invoke('read-sheet', sheetId, 'A:A');
      nextRow = readRes.success && readRes.data ? readRes.data.length + 1 : 2;
    } catch {
      addLog('⚠️ 시트 길이를 가져오는데 실패하여 기본 2행으로 세팅합니다.');
    }

    for (let i = 0; i < urlsToScrape.length; i++) {
      if (cancelScrapeRef.current) {
        addLog(`⚠️ 사용자에 의해 데이터 수집이 중단되었습니다.`);
        break;
      }

      const targetUrl = urlsToScrape[i];
      addLog(`[${i + 1}/${urlsToScrape.length}] 수집 중: ${targetUrl}`);
      try {
        const response = await window.electron.ipcRenderer.invoke('scrape-dometopia', targetUrl)

        if (response.success) {
          addLog(`  ✅ 수집 성공! 상품명: ${response.data.name}, 가격: ${response.data.salePrice}`)

          // 1. 이미지 처리는 상품 등록 전(Lazy Upload)으로 이관
          const naverImageUrl = response.data.mainImageUrl;

          const clientId = '4aTjpvduCQkMgmJjioSzFK';
          const clientSecret = '$2a$04$UNqs4AJrZASKpHqfUFGxOe';

          // 2. 스마트 카테고리 매핑 (휴리스틱 & 폴백 로직)
          let categoryId = "50004393"; // 최후의 보루 기본값 (생활/주방)
          addLog(`  분석 중인 카테고리 경로: ${response.data.categoryPath ? response.data.categoryPath.join(' > ') : '없음'}`);

          let searchKeyword = "";
          let fallbackKeyword = "";

          const path = response.data.categoryPath || [];
          if (path.length > 0) {
            const leaf = path[path.length - 1];
            // 포괄적 단어 필터링
            const genericWords = ['기타', '소품', '용품', '일반', '세트', '리필', '악세사리', '용기', '단품'];
            if (genericWords.some(w => leaf.includes(w)) && path.length >= 2) {
              // 이전 단계 단어와 조합 (예: 주방 카테고리의 기타 -> "주방 기타")
              searchKeyword = `${path[path.length - 2]} ${leaf}`.substring(0, 20);
              fallbackKeyword = path[path.length - 2]; // "주방"
            } else {
              searchKeyword = leaf;
            }
          }

          if (!searchKeyword) {
            // 경로 추출에 아예 실패했을 경우
            // 검색어로 스크래핑한 경우라면 그 검색어를 최우선 폴백으로 활용!
            if (scrapeMethod === 'search' && scrapeQuery.trim()) {
              searchKeyword = scrapeQuery.trim().substring(0, 20);
            } else {
              const nameParts = response.data.name.split(' ');
              searchKeyword = nameParts.slice(0, 2).join(' ').substring(0, 20);
            }
          }

          addLog(`  🔍 네이버 카테고리 자동 검색 시도 중... (키워드: '${searchKeyword}')`);
          try {
            let catRes = await window.electron.ipcRenderer.invoke('search-categories', clientId, clientSecret, searchKeyword);

            // 1차 검색 실패 & fallbackKeyword 가 있다면 2차 시도
            if ((!catRes.success || !catRes.data || catRes.data.length === 0) && fallbackKeyword) {
              addLog(`  ⚠️ 검색 실패. 상위 카테고리('${fallbackKeyword}')로 2차 검색을 시도합니다.`);
              catRes = await window.electron.ipcRenderer.invoke('search-categories', clientId, clientSecret, fallbackKeyword);
            }

            // 1/2차도 다 실패했다면 상품명 2어절로 최후 검색 시도
            if (!catRes.success || !catRes.data || catRes.data.length === 0) {
              const nameParts = response.data.name.split(' ');
              const finalFallback = nameParts.slice(0, 2).join(' ').substring(0, 20);
              addLog(`  ⚠️ 검색 결과 없음. 최후 안전망으로 상품명('${finalFallback}') 기반 검색을 시도합니다.`);
              catRes = await window.electron.ipcRenderer.invoke('search-categories', clientId, clientSecret, finalFallback);
            }

            if (catRes.success && catRes.data && catRes.data.length > 0) {
              categoryId = catRes.data[0].id.toString();
              // 매핑 결과 시인성 좋게 로깅
              addLog(`  [자동 카테고리 매핑 완료] ➔ 네이버 카테고리 [${catRes.data[0].name}] (ID: ${categoryId}) 적용 완료!`);
            } else {
              addLog(`  ❌ 모든 방식의 카테고리 매칭 실패. 기본값(${categoryId})으로 설정됩니다.`);
            }
          } catch {
            addLog(`  ❌ 네이버 카테고리 검색 에러 발생. 기본값 사용.`);
          }

          const rowData = [
            categoryId, // Category mapped automatically(A)
            response.data.name,
            response.data.detailHtml,
            naverImageUrl,
            response.data.salePrice.toString(),
            "100", // Default stock(F)
            "", // G: Channel Product No
            "", // H: Shipping Address ID
            "", // I: Return Address ID
            "010-0000-0000", // J: A/S Phone
            response.data.deliveryFee?.toString() || "2500", // K: 기본배송비
            response.data.freeCondition?.toString() || "0",  // L: 조건부무료액
            response.data.manufacturer || "자체제작",             // M: 제조사
            response.data.origin || "아시아/중국",               // N: 원산지
            response.data.material || "상세화면 참조",            // O: 소재
            response.data.modelName || ""                    // P: 모델명
          ];

          // 3. Write data to the next available row (Append) in the Google Sheet
          const writeRange = `A${nextRow}`;
          const writeRes = await window.electron.ipcRenderer.invoke('write-sheet', sheetId, writeRange, [rowData]);

          if (writeRes.success) {
            addLog(`  ✅ ${i + 1}번째 상품 시트 기록 완료!`);
            nextRow++;
          } else {
            addLog(`  ❌ 시트 기록 실패: ${writeRes.error}`);
          }

        } else {
          addLog(`  ❌ 수집 실패: ${response.error}`)
        }
      } catch (error: unknown) {
        const msg = error instanceof Error ? error.message : String(error);
        addLog(`  ❌ 수집 중 에러 발생: ${msg}`)
      }
    }
    addLog(`🎉 수집 프로세스가 모두 완료되었습니다.`);
    setIsScraping(false);
  }

  const handleCancelScrape = () => {
    cancelScrapeRef.current = true;
  }

  const handleAuth = async () => {
    addLog('구글 계정 인증을 시작합니다...')
    try {
      const response = await window.electron.ipcRenderer.invoke('google-auth')
      if (response.success) {
        addLog('구글 계정 인증에 성공했습니다!')
        setIsAuthenticated(true)

        // Phase 7: Fetch or create Master DB upon login
        addLog('마스터 DB 시트를 확인하는 중입니다...');
        const masterRes = await window.electron.ipcRenderer.invoke('get-or-create-master-sheet');
        if (masterRes.success && masterRes.sheetId) {
          setMasterSheetId(masterRes.sheetId);
          addLog(`✅ 마스터 DB 연결 완료! ID: ${masterRes.sheetId}`);
        } else {
          addLog(`⚠️ 마스터 DB 초기화 실패: ${masterRes.error}`);
        }

      } else {
        addLog(`인증 실패: ${response.error}`)
      }
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : String(error);
      addLog(`인증 중 오류 발생: ${msg}`)
    }
  }

  const handleCreateSheet = async () => {
    addLog('새로운 스프레드시트를 생성 및 초기화하는 중입니다...')
    try {
      const response = await window.electron.ipcRenderer.invoke('create-sheet', 'Market Integration Sheet')
      if (response.success) {
        setSheetId(response.spreadsheetId)
        addLog(`스프레드시트가 성공적으로 생성되었습니다! ID: ${response.spreadsheetId}`)

        // Immediately write headers only, no sample data
        const headers = [
          ['카테고리ID', '상품명', '상세설명', '대표이미지 URL', '판매가', '재고수량', '스마트스토어 상품번호', '출고지주소ID', '반품지주소ID', 'A/S전화번호', '기본배송비', '조건부무료액']
        ]
        const writeRes = await window.electron.ipcRenderer.invoke('write-sheet', response.spreadsheetId, 'A1:L1', headers)
        if (writeRes.success) {
          addLog('시트 헤더 초기화가 완료되었습니다.')
        } else {
          addLog(`헤더 초기화 실패: ${writeRes.error}`)
        }
      } else {
        addLog(`스프레드시트 생성 실패: ${response.error}`)
      }
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : String(error);
      addLog(`스프레드시트 생성 중 오류 발생: ${msg}`)
    }
  }

  const handleReadProducts = async () => {
    if (!sheetId) {
      addLog('Error: Please create and write to a sheet first.')
      return
    }

    addLog('스프레드시트에서 상품을 읽어오는 중입니다...')
    try {
      const response = await window.electron.ipcRenderer.invoke('read-sheet', sheetId, 'A:L')

      if (response.success) {
        if (response.data && response.data.length > 0) {
          const rowCount = response.data.length;
          const productCount = Math.max(0, rowCount - 1); // Exclude header row

          if (productCount > 0) {
            // Stage 1 Duplicate Filtering: Filter out identical product names within the same sheet
            const seenNames = new Set<string>();
            const filteredData: string[][] = [];
            let duplicateCount = 0;

            if (response.data[0] && (response.data[0][0] === '카테고리ID' || response.data[0][1] === '상품명')) {
              filteredData.push(response.data[0]); // Keep header
            }

            for (let i = (filteredData.length > 0 ? 1 : 0); i < response.data.length; i++) {
              const row = response.data[i];
              if (row.length >= 6 && row[1]) {
                const productName = row[1];
                if (seenNames.has(productName)) {
                  duplicateCount++;
                  continue;
                }
                seenNames.add(productName);
                filteredData.push(row);
              } else {
                filteredData.push(row); // Keep empty/invalid rows for accurate indexing, or handle differently
              }
            }

            addLog(`총 ${productCount}개의 상품데이터를 읽어왔습니다.`);
            if (duplicateCount > 0) {
              addLog(`⚠️ 시트 내 중복 항목 ${duplicateCount}개를 연동 목록에서 제외했습니다.`);
            }

            setSheetData(filteredData);

            const validRows = filteredData.slice(filteredData.length > 0 && (filteredData[0][0] === '카테고리ID' || filteredData[0][1] === '상품명') ? 1 : 0);
            const sampleNames = validRows.slice(0, 3).map((row: string[]) => row[1] || '이름 없음').join(', ');
            const extraCount = Math.max(0, validRows.length - 3);
            addLog(`📦 수집 대기 목록 (${validRows.length}건): ${sampleNames} ${extraCount > 0 ? `외 ${extraCount}건` : ''}`);
          } else {
            addLog(`데이터 내용이 유효하지 않거나 헤더만 존재합니다.`);
            setSheetData([]);
          }
        } else {
          addLog(`시트가 비어있거나 A:L 범위에서 유효한 데이터를 찾지 못했습니다.`);
          setSheetData([]);
        }
      } else {
        addLog(`시트 읽기 실패: ${response.error}`)
      }
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : String(error);
      addLog(`시트 읽기 중 오류 발생: ${msg}`)
    }
  }

  const handleSyncProducts = async () => {
    if (sheetData.length === 0) {
      addLog('메모리에 상품 데이터가 없습니다. 먼저 [등록할 상품 시트에서 가져오기]를 실행해주세요.');
      return;
    }

    const hasHeader = sheetData[0] && (sheetData[0][0] === '카테고리ID' || sheetData[0][1] === '상품명');
    const startIndex = hasHeader ? 1 : 0;
    const itemsCount = sheetData.length - startIndex;

    if (itemsCount <= 0) {
      addLog('유효한 상품 데이터가 없습니다.');
      return;
    }

    addLog(`총 ${itemsCount}개 상품의 연동을 시작합니다...`);

    // Stage 2 Duplicate Filtering (Upsert Check): Fetch Master DB to see what's already registered
    const registeredProducts = new Map<string, string>(); // Key: "[Vendor]_[Name]", Value: channelProductNo
    if (masterSheetId) {
      addLog('마스터 DB(기등록 상품 목록)를 조회하여 업데이트 대상을 확인합니다...');
      try {
        // Read columns A (Vendor), B (Name/SKU), and C (ChannelProductNo)
        const masterRes = await window.electron.ipcRenderer.invoke('read-sheet', masterSheetId, 'A:C');
        if (masterRes.success && masterRes.data && masterRes.data.length > 1) {
          // Skip header row
          for (let j = 1; j < masterRes.data.length; j++) {
            const mRow = masterRes.data[j];
            if (mRow.length >= 3 && mRow[0] && mRow[1] && mRow[2]) {
              const uniqueKey = `${mRow[0]}_${mRow[1]}`;
              registeredProducts.set(uniqueKey, mRow[2]);
            }
          }
          addLog(`기등록 상품 ${registeredProducts.size}건 확인 됨.`);
        }
      } catch (e) {
        addLog(`마스터 DB 조회 실패 (신규 등록으로 간주합니다): ${e}`);
      }
    }

    const clientId = '4aTjpvduCQkMgmJjioSzFK';
    const clientSecret = '$2a$04$UNqs4AJrZASKpHqfUFGxOe';

    // Initialize statuses for all valid rows to pending
    const initialStatuses: { [rowIdx: number]: { status: SyncStatus, message: string } } = { ...syncStatuses };
    for (let i = startIndex; i < sheetData.length; i++) {
      if (sheetData[i].length >= 6 && sheetData[i][0]) {
        initialStatuses[i] = { status: 'pending', message: '' };
      }
    }
    setSyncStatuses(initialStatuses);

    // Skip row 0 which is headers
    let updateCount = 0;
    let newRegisterCount = 0;

    for (let i = startIndex; i < sheetData.length; i++) {
      const row = sheetData[i];
      if (row.length < 6 || !row[0]) {
        addLog(`${i}번째 상품 건너뜀 (비어있거나 불완전함)`);
        continue;
      }

      // Phase 4: Apply Pricing Margin Algorithm (Round to nearest 10 won)
      const payloadRow = [...row];
      const originalPrice = parseInt(payloadRow[4] || '0', 10);
      const rawFinalPrice = originalPrice * (1 + marginRate / 100) + extraShippingCost;
      const finalPrice = Math.floor(rawFinalPrice / 10) * 10;
      payloadRow[4] = finalPrice.toString();

      const productName = row[1];
      // Build the unique key based on our scraping logic (assume Dometopia for now)
      const uniqueKey = `도매토피아_${productName}`;

      const existingChannelProductNo = registeredProducts.get(uniqueKey);
      const isUpdate = !!existingChannelProductNo;

      if (isUpdate) {
        addLog(`${i}번째 상품 (${productName}) ➔ [정보 수정] API 로 전송 중... [적용가: ${finalPrice.toLocaleString()}₩]`);
        setSyncStatuses(prev => ({ ...prev, [i]: { status: 'syncing', message: '정보 수정 중...' } }));
      } else {
        addLog(`${i}번째 상품 (${productName}) ➔ [신규 등록] API 로 전송 중... [적용가: ${finalPrice.toLocaleString()}₩]`);
        setSyncStatuses(prev => ({ ...prev, [i]: { status: 'syncing', message: '신규 등록 중...' } }));
      }

      // Phase 5: Lazy Image Uploading to Naver CDN
      const currentImageUrl = payloadRow[3];
      // 도매토피아 URL이거나 아직 shop1.phinf.naver.net로 변환되지 않은 경우
      if (currentImageUrl && !currentImageUrl.includes('shop1.phinf.naver.net')) {
        addLog(`[Lazy Upload] ${i}번째 상품 ➔ 이미지 네이버 CDN 업로드 중...`);
        try {
          const uploadRes = await window.electron.ipcRenderer.invoke('upload-naver-image', clientId, clientSecret, currentImageUrl);
          if (uploadRes.success && uploadRes.url) {
            payloadRow[3] = uploadRes.url;
            addLog(`✅ 이미지 변환 완료`);
            // 나중의 재실행을 위해 시트 원본도 업데이트 (D열)
            if (sheetId) {
              await window.electron.ipcRenderer.invoke('update-sheet-cell', sheetId, `D${i + 1}`, uploadRes.url);
            }
          } else {
            addLog(`⚠️ 이미지 변환 실패. 원본 URL을 전송합니다 (에러코드 반환 확률 높음).`);
          }
        } catch (e) {
          addLog(`⚠️ 이미지 업로드 IPC 에러 발생.`);
        }
      }

      try {
        let response;
        if (isUpdate) {
          response = await window.electron.ipcRenderer.invoke('update-product', clientId, clientSecret, existingChannelProductNo, payloadRow);
        } else {
          response = await window.electron.ipcRenderer.invoke('register-product', clientId, clientSecret, payloadRow);
        }

        if (response.success) {
          if (isUpdate) {
            updateCount++;
            addLog(`✅ ${i}번째 상품 스토어 [수정] 성공! (상품번호: ${response.channelProductNo})`);
          } else {
            newRegisterCount++;
            addLog(`✅ ${i}번째 상품 스토어 [신규등록] 성공! (채널상품번호: ${response.channelProductNo})`);
          }
          // Phase 6: Sync product ID back to Google Sheets Column G
          const rowNumber = i + 1; // Sheets rows are 1-indexed
          const cellRange = `G${rowNumber}`;

          addLog(`시트 업데이트 중... (${cellRange})`);
          try {
            const sheetRes = await window.electron.ipcRenderer.invoke('update-sheet-cell', sheetId, cellRange, response.channelProductNo);
            if (sheetRes.success) {
              setSyncStatuses(prev => ({ ...prev, [i]: { status: 'success', message: `No: ${response.channelProductNo} (시트저장 완료)` } }));
            } else {
              setSyncStatuses(prev => ({ ...prev, [i]: { status: 'success', message: `No: ${response.channelProductNo} (시트저장 실패: ${sheetRes.error})` } }));
            }

            // Phase 7: Append to Master DB Sheet (Only for new registrations to avoid appending updates repeatedly)
            if (masterSheetId && !isUpdate) {
              const currentDate = new Date().toISOString();
              // [Vendor, SKU/Name, ChannelProductNo, Price, Date]
              const masterRow = [
                '도매토피아',
                sheetData[i][1] || 'UnknownItem',
                response.channelProductNo,
                finalPrice.toString(),
                currentDate
              ];
              const appendRes = await window.electron.ipcRenderer.invoke('append-to-master-sheet', masterSheetId, [masterRow]);
              if (!appendRes.success) {
                addLog(`⚠️ 마스터 DB 기록 실패: ${appendRes.error}`);
              } else {
                addLog(`✅ 마스터 DB 신규 기록 완료: ${response.channelProductNo}`);
              }
            } else if (masterSheetId && isUpdate) {
              addLog(`ℹ️ (마스터 DB에 이미 기록된 항목이므로 가격/업데이트 내역은 스마트스토어에만 반영됨)`);
            }
          } catch {
            setSyncStatuses(prev => ({ ...prev, [i]: { status: 'success', message: `No: ${response.channelProductNo} (시트저장 오류)` } }));
          }
        } else {
          addLog(`❌ ${i}번째 상품 실패: ${response.error}`);
          setSyncStatuses(prev => ({ ...prev, [i]: { status: 'failed', message: response.error } }));
        }
      } catch (error: unknown) {
        const msg = error instanceof Error ? error.message : String(error);
        addLog(`❌ ${i}번째 상품 ${isUpdate ? '수정' : '등록'} 중 오류 발생: ${msg}`);
        setSyncStatuses(prev => ({ ...prev, [i]: { status: 'failed', message: msg } }));
      }
    }

    addLog(`✨ 모든 연동 작업이 완료되었습니다! (신규 등록: ${newRegisterCount}건, 정보 수정: ${updateCount}건)`);
  }

  const handleFetchSmartStoreOrders = async () => {
    if (!sheetId) {
      addLog('에러: 주문을 저장할 구글 시트를 먼저 연동해주세요.');
      return;
    }

    const clientId = '4aTjpvduCQkMgmJjioSzFK';
    const clientSecret = '$2a$04$UNqs4AJrZASKpHqfUFGxOe';

    addLog('네이버 스마트스토어 API에서 최근 24시간 내 수정된 주문을 수집 중입니다...');
    try {
      const response = await window.electron.ipcRenderer.invoke('fetch-smartstore', clientId, clientSecret);

      if (response.success) {
        const orders = response.data; // Array of arrays

        if (!orders || orders.length === 0) {
          addLog('✅ 성공! 최근 24시간 내 신규/수정된 주문이 없습니다.');
          return;
        }

        addLog(`총 ${orders.length}개의 주문을 성공적으로 수집했습니다. 구글 시트에 저장합니다...`);

        // 시트에 바로 Append 하기 위해 기존 시트의 데이터 길이를 구함 (orders를 M열 등에 써도 되지만, 밑에 이어쓰기로 PoC 진행)
        const readRes = await window.electron.ipcRenderer.invoke('read-sheet', sheetId, 'A:A');
        const nextRow = readRes.success && readRes.data ? readRes.data.length + 2 : 10;

        // A~J 열에 주문 데이터 쓰기 (간단한 로깅 목적)
        const writeRange = `A${nextRow}`;

        // 헤더 1줄 임의 추가
        const orderDataToWrite = [
          ['--- 신규 주문 수집 내역 ---', '', '', '', '', '', '', '', '', ''],
          ['주문일시', '주문번호', '상품명', '옵션', '수량', '수취인', '주소', '연락처', '결제금액', '주문상태'],
          ...orders
        ];

        const writeRes = await window.electron.ipcRenderer.invoke('write-sheet', sheetId, `${writeRange}:J${nextRow + orderDataToWrite.length}`, orderDataToWrite);

        if (writeRes.success) {
          addLog(`✅ 주문 데이터를 ${writeRange} 범위에 성공적으로 기록했습니다!`);
        } else {
          addLog(`❌ 주문 데이터 기록 실패: ${writeRes.error}`);
        }

      } else {
        addLog(`수집 실패: ${response.error}`);
      }
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : String(error);
      addLog(`주문 수집 중 오류: ${msg}`);
    }
  }

  const handleOpenSheet = async () => {
    if (!sheetId) return;
    const url = `https://docs.google.com/spreadsheets/d/${sheetId}/edit`;
    await window.electron.ipcRenderer.invoke('open-external', url);
  }


  if (!isAuthenticated) {
    return (
      <div className="container animate-fade-in" style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh', width: '100vw'
      }}>
        <div className="glass-panel" style={{ width: '100%', maxWidth: '420px', textAlign: 'center', padding: '48px 32px' }}>
          <div style={{ fontSize: '48px', marginBottom: '24px' }}>🔐</div>
          <h1 style={{ marginBottom: '16px', fontSize: '32px', fontWeight: 700, letterSpacing: '-0.5px' }}>WISE</h1>
          <p style={{ color: 'var(--color-text-dim)', marginBottom: '32px', fontSize: '15px', lineHeight: '1.6' }}>시스템 접근 권한 및 스프레드시트 연동을 위해<br />Google 계정으로 로그인해주세요.</p>
          <button className="primary" onClick={handleAuth} style={{ width: '100%', padding: '16px', fontSize: '16px', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px', backgroundColor: '#ffffff', color: '#1e293b', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)' }}>
            <svg viewBox="0 0 24 24" width="20" height="20" xmlns="http://www.w3.org/2000/svg"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" /><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" /><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" /><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" /></svg>
            <span style={{ fontWeight: 600 }}>Google 계정으로 시작하기</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="app-container">
      {/* Left: Main Steps Wizard */}
      <div className="wizard-container">
        <Stepper steps={WIZARD_STEPS} currentStep={currentStep} />

        <div className="step-content-scroll">
          {currentStep === 1 && (
            <DataPrepStep
              sheetId={sheetId}
              handleCreateSheet={handleCreateSheet}
              handleOpenSheet={handleOpenSheet}
              scrapeMethod={scrapeMethod}
              setScrapeMethod={setScrapeMethod}
              scrapeQuery={scrapeQuery}
              setScrapeQuery={setScrapeQuery}
              handleScrape={handleScrape}
              isScraping={isScraping}
              handleCancelScrape={handleCancelScrape}
            />
          )}

          {currentStep === 2 && (
            <MarketSyncStep
              sheetData={sheetData}
              syncStatuses={syncStatuses}
              handleReadProducts={handleReadProducts}
              handleSyncProducts={handleSyncProducts}
              handleFetchSmartStoreOrders={handleFetchSmartStoreOrders}
              marginRate={marginRate}
              setMarginRate={setMarginRate}
              extraShippingCost={extraShippingCost}
              setExtraShippingCost={setExtraShippingCost}
              masterSheetId={masterSheetId!}
            />
          )}
        </div>

        <div className="wizard-footer">
          <button
            className="ghost"
            onClick={() => setCurrentStep(prev => Math.max(1, prev - 1))}
            disabled={currentStep === 1}
          >
            ← 이전 단계
          </button>

          <div style={{ fontWeight: 600, color: '#e2e8f0' }}>{currentStep} / {WIZARD_STEPS.length} 구역 이동</div>

          <button
            className="primary"
            onClick={() => setCurrentStep(prev => Math.min(WIZARD_STEPS.length, prev + 1))}
            disabled={currentStep === WIZARD_STEPS.length}
          >
            {currentStep === WIZARD_STEPS.length ? '완료' : '다음 단계 →'}
          </button>
        </div>
      </div>

      {/* Right: Action Logs Terminal */}
      <ActionLogs logs={logs} />
    </div>
  );
}

export default App;
