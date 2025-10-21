// ========== UI 렌더링 ==========

/**
 * 레벨 선택 화면 렌더링
 */
function renderLevelSelection() {
    const levelGrid = document.getElementById('levelGrid');
    levelGrid.innerHTML = '';
    const levelClasses = ['cat', 'princess', 'wolf', 'coffee', 'snitch'];

    for (let i = 1; i <= 5; i++) {
        const levelInfo = window.progress.levels[i];
        const isUnlocked = i === 1 || (window.progress.levels[i - 1].mcPassed && window.progress.levels[i - 1].tpPassed);
        
        const card = document.createElement('div');
        card.className = 'level-card' + (isUnlocked ? '' : ' disabled');

        // 완료 배지
        let statusHTML = '';
        if (levelInfo.mcPassed && levelInfo.tpPassed) {
            statusHTML = '<div class="status-badge">✓ 완료</div>';
        }

        // 점수 표시
        let scoreHTML = '';
        if (levelInfo.mcTotal > 0 || levelInfo.tpTotal > 0) {
            scoreHTML = '<div class="score-display">';
            if (levelInfo.mcTotal > 0) {
                scoreHTML += '<span class="mc-score">MC: ' + levelInfo.mcScore + '/' + levelInfo.mcTotal + '</span>';
            }
            if (levelInfo.tpTotal > 0) {
                scoreHTML += '<span class="tp-score">TP: ' + levelInfo.tpScore + '/' + levelInfo.tpTotal + '</span>';
            }
            scoreHTML += '</div>';
        }

        // 카드 내용 생성
        card.innerHTML = '<div class="level-icon ' + levelClasses[i-1] + '">' + 
            (i === 4 ? '<span class="cup">☕</span>' : '') + 
            '</div>' +
            '<div class="level-title">Level ' + i + '</div>' +
            '<div class="mode-buttons">' +
                '<button class="mode-btn mc" ' + (isUnlocked ? '' : 'disabled') + ' onclick="startMode(' + i + ', \'mc\')">Multiple Choice</button>' +
                '<button class="mode-btn tp" ' + (isUnlocked ? '' : 'disabled') + ' onclick="startMode(' + i + ', \'tp\')">Typing Practice</button>' +
            '</div>' +
            scoreHTML +
            statusHTML;
        
        levelGrid.appendChild(card);
    }

    // 화면 전환
    document.getElementById('levelSelection').style.display = 'block';
    document.getElementById('learningMode').classList.remove('active');
}

/**
 * 진행률 업데이트
 */
function updateProgress() {
    const total = currentQuestions.length;
    const current = currentQuestionIndex + 1;
    document.getElementById('questionCounter').textContent = current + ' / ' + total;
    const percentage = (current / total) * 100;
    document.getElementById('progressFill').style.width = percentage + '%';
}

/**
 * 결과 모달 표시
 */
function showResultModal() {
    const totalQuestions = currentQuestions.length;
    const passScore = Math.ceil(totalQuestions * 0.9);
    const isPassed = score >= passScore;
    const percentage = Math.round((score / totalQuestions) * 100);

    // 결과 제목 설정
    let resultTitle = '';
    if (isPassed) {
        resultTitle = currentMode === 'mc' ? 'Schönen Tag 🎉' : 'Tschüssikowski! 🎊';
    } else {
        resultTitle = '다시 시도해주세요 📝';
    }

    document.getElementById('resultTitle').textContent = resultTitle;
    document.getElementById('resultScore').textContent = score + ' / ' + totalQuestions;
    document.getElementById('resultMessage').textContent = '정답률: ' + percentage + '% ' + (isPassed ? '통과했습니다!' : '통과하지 못했습니다.');

    // 진행 상황 업데이트
    if (currentMode === 'mc') {
        window.progress.levels[currentLevel].mcScore = score;
        window.progress.levels[currentLevel].mcTotal = totalQuestions;
        if (isPassed) {
            window.progress.levels[currentLevel].mcPassed = true;
        }
    } else {
        window.progress.levels[currentLevel].tpScore = score;
        window.progress.levels[currentLevel].tpTotal = totalQuestions;
        if (isPassed) {
            window.progress.levels[currentLevel].tpPassed = true;
        }
    }
    saveProgressToStorage();

    // 레벨 완전 통과 축하 메시지
    const levelInfo = window.progress.levels[currentLevel];
    const previousMCPassed = currentMode === 'tp' && levelInfo.mcPassed;
    const previousTPPassed = currentMode === 'mc' && levelInfo.tpPassed;
    
    if (levelInfo.mcPassed && levelInfo.tpPassed && isPassed && (previousMCPassed || previousTPPassed)) {
        setTimeout(function() {
            alert('갈채! 해냈어 애기! 기특해. 공부도 중요하지만 당신을 항상 아껴주기! 🦐💖');
        }, 500);
    }

    document.getElementById('resultModal').classList.add('show');
}

/**
 * 레벨 선택 화면으로 돌아가기
 */
function backToLevelSelection() {
    document.getElementById('resultModal').classList.remove('show');
    document.getElementById('learningMode').classList.remove('active');
    renderLevelSelection();
}

/**
 * 재시도
 */
function retryMode() {
    document.getElementById('resultModal').classList.remove('show');
    startMode(currentLevel, currentMode);
}

// ========== 통계 모달 ==========

/**
 * 통계 모달 표시
 */
function showStatsModal() {
    updateStatsDisplay();
    document.getElementById('statsModal').classList.add('show');
}

/**
 * 통계 모달 닫기
 */
function closeStatsModal() {
    document.getElementById('statsModal').classList.remove('show');
}

/**
 * 통계 표시 업데이트
 */
function updateStatsDisplay() {
    const totalWords = window.stats.totalAttempts;
    const totalCorrect = window.stats.totalCorrect;
    const accuracy = totalWords > 0 ? Math.round((totalCorrect / totalWords) * 100) : 0;
    
    // 완료한 레벨 수 계산
    let completedLevels = 0;
    for (let i = 1; i <= 5; i++) {
        if (window.progress.levels[i].mcPassed && window.progress.levels[i].tpPassed) {
            completedLevels++;
        }
    }

    // 전체 통계 업데이트
    document.getElementById('totalWords').textContent = totalWords + '개';
    document.getElementById('totalCorrect').textContent = totalCorrect + '개';
    document.getElementById('totalAccuracy').textContent = accuracy + '%';
    document.getElementById('completedLevels').textContent = completedLevels + '개';

    // 자주 틀리는 단어 TOP 10
    const mistakeList = document.getElementById('mistakeList');
    const mistakes = Object.values(window.stats.mistakes)
        .sort(function(a, b) { return b.count - a.count; })
        .slice(0, 10);

    if (mistakes.length === 0) {
        mistakeList.innerHTML = '<p style="text-align: center; color: #999;">아직 데이터가 없습니다.</p>';
    } else {
        mistakeList.innerHTML = mistakes.map(function(mistake) {
            return '<div class="mistake-item">' +
                '<div class="mistake-word">' + mistake.english + ' → ' + mistake.korean + '</div>' +
                '<div class="mistake-count">틀린 횟수: ' + mistake.count + '회</div>' +
                '</div>';
        }).join('');
    }
}