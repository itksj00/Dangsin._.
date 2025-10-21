// ========== 로컬스토리지 관리 ==========

const STORAGE_KEY = 'vocabProgress';
const STATS_KEY = 'vocabStats';

// ========== 진행 상황 관리 ==========

/**
 * 로컬스토리지에서 진행 상황 불러오기
 */
function loadProgressFromStorage() {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) {
        initializeProgress();
        return;
    }
    window.progress = JSON.parse(saved);
}

/**
 * 진행 상황 초기화
 */
function initializeProgress() {
    window.progress = { levels: {} };
    for (let i = 1; i <= 5; i++) {
        window.progress.levels[i] = {
            mcPassed: false,      // Multiple Choice 통과 여부
            tpPassed: false,      // Typing Practice 통과 여부
            mcScore: 0,           // MC 최고 점수
            tpScore: 0,           // TP 최고 점수
            mcTotal: 0,           // MC 총 문제 수
            tpTotal: 0            // TP 총 문제 수
        };
    }
    saveProgressToStorage();
}

/**
 * 진행 상황을 로컬스토리지에 저장
 */
function saveProgressToStorage() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(window.progress));
}

// ========== 통계 관리 ==========

/**
 * 로컬스토리지에서 통계 불러오기
 */
function loadStatsFromStorage() {
    const saved = localStorage.getItem(STATS_KEY);
    if (!saved) {
        window.stats = {
            totalAttempts: 0,     // 총 시도한 문제 수
            totalCorrect: 0,      // 총 정답 수
            mistakes: {}          // 틀린 단어 추적 (key: "english|korean")
        };
        saveStatsToStorage();
        return;
    }
    window.stats = JSON.parse(saved);
}

/**
 * 통계를 로컬스토리지에 저장
 */
function saveStatsToStorage() {
    localStorage.setItem(STATS_KEY, JSON.stringify(window.stats));
}

/**
 * 답변 기록하기
 * @param {number} questionId - 문제 ID
 * @param {string} english - 영어 단어
 * @param {string} korean - 한글 뜻
 * @param {boolean} isCorrect - 정답 여부
 */
function recordAnswer(questionId, english, korean, isCorrect) {
    window.stats.totalAttempts++;
    
    if (isCorrect) {
        window.stats.totalCorrect++;
    } else {
        // 틀린 단어 기록
        const key = english + '|' + korean;
        if (!window.stats.mistakes[key]) {
            window.stats.mistakes[key] = {
                english: english,
                korean: korean,
                count: 0
            };
        }
        window.stats.mistakes[key].count++;
    }
    
    saveStatsToStorage();
}