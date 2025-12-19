// ========== 퀴즈 로직 ==========

/**
 * 한글 단어 발음 재생 (Web Speech API)
 * @param {string} text - 발음할 한글 텍스트
 */
function speakKorean(text) {
    // 이전 발음 중지
    speechSynthesis.cancel();
    
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'ko-KR';  // 한국어 설정
    utterance.rate = 0.85;      // 속도 (0.1 ~ 10)
    utterance.pitch = 1;        // 음높이 (0 ~ 2)
    utterance.volume = 1;       // 볼륨 (0 ~ 1)
    
    speechSynthesis.speak(utterance);
}

/**
 * 모드 시작
 * @param {number} level - 레벨 번호 (1-20)
 * @param {string} mode - 모드 ('mc' 또는 'tp')
 */
function startMode(level, mode) {
    currentLevel = level;
    currentMode = mode;
    currentQuestionIndex = 0;
    score = 0;
    answered = false;

    // 문제 섞기
    currentQuestions = levelData[level].slice().sort(function() { return Math.random() - 0.5; });

    // 화면 전환
    document.getElementById('levelSelection').style.display = 'none';
    document.getElementById('learningMode').classList.add('active');

    document.getElementById('mcMode').style.display = mode === 'mc' ? 'block' : 'none';
    document.getElementById('tpMode').style.display = mode === 'tp' ? 'block' : 'none';

    const modeTitle = mode === 'mc' ? 'Level ' + level + ' - Multiple Choice' : 'Level ' + level + ' - Typing Practice';
    document.getElementById('modeTitle').textContent = modeTitle;

    if (mode === 'mc') {
        displayMCQuestion();
    } else {
        displayTPQuestion();
    }
}

// ========== Multiple Choice 모드 ==========

/**
 * MC 문제 표시
 */
function displayMCQuestion() {
    if (currentQuestionIndex >= currentQuestions.length) {
        showResultModal();
        return;
    }

    answered = false;
    document.getElementById('mcFeedback').classList.remove('show', 'correct', 'incorrect');
    document.getElementById('mcNextBtn').disabled = true;

    const question = currentQuestions[currentQuestionIndex];
    
    // 한글 뜻 + 스피커 버튼
    const koreanWithSpeaker = question.korean + ' <button class="speaker-btn" onclick="speakKorean(\'' + question.korean + '\'); event.stopPropagation();">🔊</button>';
    
    document.getElementById('mcPosLabel').textContent = '(' + question.pos + ')';
    document.getElementById('koreanWord').innerHTML = koreanWithSpeaker;  // innerHTML으로 변경
    document.getElementById('mcExampleSentence').textContent = question.korExample;

    // 선택지 생성 (같은 품사끼리만)
    const answers = [question.english];
    const samePosList = currentQuestions.filter(function(q) { 
        return q.id !== question.id && q.pos === question.pos; 
    });
    
    // 같은 품사가 3개 미만이면 다른 품사도 포함
    if (samePosList.length < 3) {
        const otherWords = currentQuestions.filter(function(q) { return q.id !== question.id; });
        while (answers.length < 4 && otherWords.length > 0) {
            const randomIndex = Math.floor(Math.random() * otherWords.length);
            const randomWord = otherWords[randomIndex].english;
            if (answers.indexOf(randomWord) === -1) {
                answers.push(randomWord);
            }
        }
    } else {
        // 같은 품사에서 3개 선택
        const shuffledSamePos = samePosList.slice().sort(function() { return Math.random() - 0.5; });
        for (let i = 0; i < shuffledSamePos.length && answers.length < 4; i++) {
            answers.push(shuffledSamePos[i].english);
        }
    }
    
    // 선택지 섞기
    answers.sort(function() { return Math.random() - 0.5; });

    // 선택지 버튼 생성
    const choicesDiv = document.getElementById('choices');
    choicesDiv.innerHTML = '';
    answers.forEach(function(answer, idx) {
        const btn = document.createElement('button');
        btn.className = 'choice-btn';
        btn.textContent = answer;
        btn.onclick = function() { selectMCAnswer(answer, question.english, idx); };
        btn.addEventListener('keydown', function(e) {
            if (e.key === 'Enter') {
                e.preventDefault();
                if (!answered) {
                    selectMCAnswer(answer, question.english, idx);
                } else {
                    const nextBtn = document.getElementById('mcNextBtn');
                    if (nextBtn && !nextBtn.disabled) nextMCQuestion();
                }
            }
        });
        choicesDiv.appendChild(btn);
    });

    updateProgress();
    document.addEventListener('keydown', handleMCEnter);
}

/**
 * MC Enter 키 핸들러
 */
function handleMCEnter(e) {
    if (e.key === 'Enter' && !document.getElementById('mcNextBtn').disabled) {
        nextMCQuestion();
    }
}

/**
 * MC 답변 선택
 */
function selectMCAnswer(selected, correct, idx) {
    const question = currentQuestions[currentQuestionIndex];
    if (answered) return;

    const isCorrect = selected === correct;
    answered = true;

    if (isCorrect) {
        score++;
        recordAnswer(question.id, question.english, question.korean, true);
    } else {
        recordAnswer(question.id, question.english, question.korean, false);
    }

    // 버튼 상태 업데이트
    const choiceBtns = document.querySelectorAll('.choice-btn');
    choiceBtns.forEach(function(btn, i) {
        btn.disabled = true;
        if (btn.textContent === correct) {
            btn.classList.add('selected', 'correct');
        }
    });

    if (!isCorrect) {
        choiceBtns[idx].classList.add('selected', 'incorrect');
    }

    // 피드백 표시
    const feedback = document.getElementById('mcFeedback');
    if (isCorrect) {
        feedback.textContent = '✓ 정답입니다!';
        feedback.classList.add('show', 'correct');
    } else {
        feedback.textContent = '✗ 오답입니다. 정답: ' + correct;
        feedback.classList.add('show', 'incorrect');
    }

    document.getElementById('mcNextBtn').disabled = false;
}

/**
 * MC 다음 문제
 */
function nextMCQuestion() {
    document.removeEventListener('keydown', handleMCEnter);
    currentQuestionIndex++;
    if (currentQuestionIndex >= currentQuestions.length) {
        showResultModal();
    } else {
        displayMCQuestion();
    }
}

// ========== Typing Practice 모드 ==========

/**
 * TP 문제 표시
 */
function displayTPQuestion() {
    if (currentQuestionIndex >= currentQuestions.length) {
        showResultModal();
        return;
    }

    document.removeEventListener('keydown', handleMCEnter);

    answered = false;
    document.getElementById('tpFeedback').classList.remove('show', 'correct', 'incorrect');
    document.getElementById('tpSubmitBtn').disabled = false;
    document.getElementById('tpSubmitBtn').style.display = 'inline-block';
    
    const tpNextBtn = document.getElementById('tpNextBtn');
    if (tpNextBtn) {
        tpNextBtn.style.display = 'none';
        tpNextBtn.removeEventListener('keydown', handleTPNextKey);
    }

    const question = currentQuestions[currentQuestionIndex];
    document.getElementById('posLabel').textContent = '(' + question.pos + ')';
    document.getElementById('englishWord').textContent = question.english;
    document.getElementById('exampleSentence').textContent = question.example;

    // ✅ 입력 박스 생성
    const inputBoxes = document.getElementById('inputBoxes');
    inputBoxes.innerHTML = '';
    
    for (let i = 0; i < question.korean.length; i++) {
        const input = document.createElement('input');
        input.type = 'text';
        input.className = 'input-box';
        input.dataset.index = i;
        input.maxLength = 1;

        let composing = false;

        input.addEventListener('compositionstart', function () {
            composing = true;
        });

        input.addEventListener('compositionend', function (e) {
            composing = false;
            const value = e.target.value;
            if (value.length > 0 && i < question.korean.length - 1) {
                inputBoxes.children[i + 1].focus();
            }
        });

        // ✅ 모바일 대응 핵심: input 이벤트 기반 처리
        input.addEventListener('input', function (e) {
            if (composing) return;

            const value = e.target.value;

            if (value.length === 1 && i < question.korean.length - 1) {
                inputBoxes.children[i + 1].focus();
            }
        });

        input.addEventListener('keydown', function (e) {
            if (e.key === 'Backspace') {
                if (input.value === '' && i > 0) {
                    e.preventDefault();
                    inputBoxes.children[i - 1].focus();
                }
            } else if (e.key === 'Enter') {
                e.preventDefault();
                if (!answered && document.getElementById('tpSubmitBtn').style.display !== 'none') {
                    submitTypingPractice();
                }
            }
        });

        inputBoxes.appendChild(input);
    }

    if (inputBoxes.children.length > 0) {
        inputBoxes.children[0].focus();
    }

    updateProgress();
}

/**
 * TP 제출
 */
function submitTypingPractice() {
    if (answered) return;
    answered = true;

    const question = currentQuestions[currentQuestionIndex];
    const inputBoxes = Array.from(document.querySelectorAll('.input-box'));
    const userAnswer = inputBoxes.map(function(box) { return box.value; }).join('');
    const isCorrect = userAnswer === question.korean;

    if (isCorrect) score++;

    recordAnswer(question.id, question.english, question.korean, isCorrect);

    // 입력 박스 상태 업데이트
    inputBoxes.forEach(function(box, idx) {
        box.disabled = true;
        if (userAnswer[idx] === question.korean[idx]) {
            box.classList.add('correct');
        } else {
            box.classList.add('incorrect');
        }
    });

    // 피드백 표시
    const feedback = document.getElementById('tpFeedback');
    feedback.textContent = isCorrect ? '✓ 정답입니다!' : '✗ 오답입니다. 정답: ' + question.korean;
    feedback.classList.add('show', isCorrect ? 'correct' : 'incorrect');

    // 버튼 상태 변경
    const tpSubmitBtn = document.getElementById('tpSubmitBtn');
    const tpNextBtn = document.getElementById('tpNextBtn');
    if (tpSubmitBtn) {
        tpSubmitBtn.style.display = 'none';
        tpSubmitBtn.disabled = true;
    }
    if (tpNextBtn) {
        tpNextBtn.style.display = 'inline-block';
        tpNextBtn.disabled = false;
        tpNextBtn.focus();
        tpNextBtn.removeEventListener('keydown', handleTPNextKey);
        tpNextBtn.addEventListener('keydown', handleTPNextKey);
    }
}

/**
 * TP 다음 버튼 Enter 키 핸들러
 */
function handleTPNextKey(e) {
    if (e.key !== 'Enter') return;
    e.preventDefault();
    if (!answered) return;
    nextTPQuestion();
}

/**
 * TP 다음 문제
 */
function nextTPQuestion() {
    const tpNextBtn = document.getElementById('tpNextBtn');
    if (tpNextBtn) {
        tpNextBtn.removeEventListener('keydown', handleTPNextKey);
    }

    currentQuestionIndex++;
    if (currentQuestionIndex >= currentQuestions.length) {
        showResultModal();
    } else {
        displayTPQuestion();
    }
}