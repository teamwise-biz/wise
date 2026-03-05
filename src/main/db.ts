import { app } from 'electron';
import * as path from 'path';
import * as fs from 'fs';

// 카테고리 매핑 룰 타입 정의
export interface CategoryRule {
    dometopiaUrl: string;       // 도매토피아 카테고리 (키)
    dometopiaName: string;      // 도매토피아 카테고리명 (표시용)
    naverCategoryId: string;    // 네이버 카테고리 ID (값)
    naverCategoryName: string;  // 네이버 카테고리명 (표시용)
}

const getRulesFilePath = () => {
    // 개발 모드와 프로덕션 모드 모두에서 안전하게 userData 폴더를 사용
    const userDataPath = app.getPath('userData');
    return path.join(userDataPath, 'category_rules.json');
};

/**
 * 저장된 모든 카테고리 룰 목록을 반환합니다.
 */
export const getCategoryRules = (): CategoryRule[] => {
    const filePath = getRulesFilePath();
    if (!fs.existsSync(filePath)) {
        return [];
    }
    try {
        const data = fs.readFileSync(filePath, 'utf-8');
        return JSON.parse(data) as CategoryRule[];
    } catch (error) {
        console.error('Failed to read category rules:', error);
        return [];
    }
};

/**
 * 새로운 카테고리 매핑 룰을 추가하거나 덮어씁니다.
 * @param rule 추가할 룰 객체
 */
export const saveCategoryRule = (rule: CategoryRule): void => {
    const rules = getCategoryRules();
    const existingIndex = rules.findIndex(r => r.dometopiaUrl === rule.dometopiaUrl);

    if (existingIndex >= 0) {
        // 기존 룰 덮어쓰기
        rules[existingIndex] = rule;
    } else {
        // 새 룰 추가
        rules.push(rule);
    }

    const filePath = getRulesFilePath();
    fs.writeFileSync(filePath, JSON.stringify(rules, null, 2), 'utf-8');
};

/**
 * 특정 카테고리 매핑 룰을 삭제합니다.
 * @param dometopiaUrl 삭제할 도매토피아 URL
 */
export const deleteCategoryRule = (dometopiaUrl: string): void => {
    const rules = getCategoryRules();
    const filtered = rules.filter(r => r.dometopiaUrl !== dometopiaUrl);
    
    const filePath = getRulesFilePath();
    fs.writeFileSync(filePath, JSON.stringify(filtered, null, 2), 'utf-8');
};

/**
 * 특정 도매토피아 URL에 매핑된 네이버 카테고리 ID를 조회합니다.
 * @param dometopiaUrl 도매토피아 URL
 */
export const findRuleByUrl = (dometopiaUrl: string): CategoryRule | undefined => {
    const rules = getCategoryRules();
    return rules.find(r => r.dometopiaUrl === dometopiaUrl);
};
