/**
 * 動画・音声の倍速再生時間計算ツール
 * リアルタイム即時計算ロジック & UIインタラクション
 */

document.addEventListener('DOMContentLoaded', () => {
  // DOM Elements - Inputs
  const hoursInput = document.getElementById('hours-input');
  const minutesInput = document.getElementById('minutes-input');
  const secondsInput = document.getElementById('seconds-input');
  const speedButtons = document.querySelectorAll('.speed-btn');
  const customSpeedSlider = document.getElementById('custom-speed-slider');
  const customSpeedInput = document.getElementById('custom-speed-input');
  const presetChips = document.querySelectorAll('.chip-btn');
  const resetBtn = document.getElementById('reset-btn');

  // DOM Elements - Outputs
  const resultSpeedCaption = document.getElementById('result-speed-caption');
  const rateBadge = document.getElementById('rate-badge');
  const playbackDurationDisplay = document.getElementById('playback-duration-display');
  const originalDurationSummary = document.getElementById('original-duration-summary');
  const savedDurationDisplay = document.getElementById('saved-duration-display');
  const savedSentence = document.getElementById('saved-sentence');
  const playbackBar = document.getElementById('playback-bar');
  const savedBar = document.getElementById('saved-bar');
  const ratioPercentText = document.getElementById('ratio-percent-text');
  const comparisonTableBody = document.getElementById('comparison-table-body');
  const copyResultBtn = document.getElementById('copy-result-btn');
  const copyBtnText = document.getElementById('copy-btn-text');

  // Comparison speeds to display in the overview table
  const TABLE_SPEEDS = [1.0, 1.25, 1.5, 1.75, 2.0, 2.5];

  /**
   * 秒数を { hours, minutes, seconds } オブジェクトに変換
   */
  function secondsToHms(totalSeconds) {
    const s = Math.max(0, Math.round(totalSeconds));
    const hours = Math.floor(s / 3600);
    const minutes = Math.floor((s % 3600) / 60);
    const seconds = s % 60;
    return { hours, minutes, seconds, totalSeconds: s };
  }

  /**
   * 時間表示のHTML文字列を生成
   * 例: "1<span class='unit'>時間</span> 20<span class='unit'>分</span> 00<span class='unit'>秒</span>"
   */
  function formatHmsHtml(hms, padZero = true) {
    const pad = (n) => (padZero && n < 10 ? `0${n}` : `${n}`);
    const parts = [];

    if (hms.hours > 0) {
      parts.push(`${hms.hours}<span class="unit">時間</span>`);
      parts.push(`${pad(hms.minutes)}<span class="unit">分</span>`);
      parts.push(`${pad(hms.seconds)}<span class="unit">秒</span>`);
    } else {
      parts.push(`${hms.minutes}<span class="unit">分</span>`);
      parts.push(`${pad(hms.seconds)}<span class="unit">秒</span>`);
    }
    return parts.join(' ');
  }

  /**
   * プレーンテキスト用の時間文字列
   */
  function formatHmsText(hms, padZero = true) {
    const pad = (n) => (padZero && n < 10 ? `0${n}` : `${n}`);
    if (hms.hours > 0) {
      return `${hms.hours}時間 ${pad(hms.minutes)}分 ${pad(hms.seconds)}秒`;
    }
    return `${hms.minutes}分 ${pad(hms.seconds)}秒`;
  }

  /**
   * 現在の入力値を取得
   */
  function getInputs() {
    const h = parseInt(hoursInput.value, 10) || 0;
    const m = parseInt(minutesInput.value, 10) || 0;
    const s = parseInt(secondsInput.value, 10) || 0;
    const speed = parseFloat(customSpeedInput.value) || 1.0;

    return {
      hours: Math.max(0, h),
      minutes: Math.max(0, m),
      seconds: Math.max(0, s),
      speed: Math.max(0.1, speed)
    };
  }

  /**
   * プリセットボタンのActive状態を更新
   */
  function syncActivePresetButton(currentSpeed) {
    speedButtons.forEach(btn => {
      const btnSpeed = parseFloat(btn.dataset.speed);
      // 小数点第2位までの丸め一致で比較
      if (Math.abs(btnSpeed - currentSpeed) < 0.01) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    });
  }

  /**
   * 主要倍速テーブルの再描画
   */
  function renderComparisonTable(originalSeconds, currentSpeed) {
    if (!comparisonTableBody) return;

    let html = '';
    TABLE_SPEEDS.forEach(speed => {
      const isCurrent = Math.abs(speed - currentSpeed) < 0.01;
      const playSec = Math.round(originalSeconds / speed);
      const savedSec = Math.max(0, originalSeconds - playSec);

      const playHms = secondsToHms(playSec);
      const savedHms = secondsToHms(savedSec);

      const playStr = formatHmsText(playHms, false);
      const savedStr = speed === 1.0 ? '0分 (等倍)' : `-${formatHmsText(savedHms, false)}`;

      html += `
        <tr class="${isCurrent ? 'current-speed-row' : ''}">
          <td><strong>${speed.toFixed(speed % 1 === 0 ? 1 : 2)}x</strong> ${isCurrent ? '<span style="font-size:0.7rem; color:#a5b4fc;">(現在)</span>' : ''}</td>
          <td>${playStr}</td>
          <td class="saved-col">${savedStr}</td>
        </tr>
      `;
    });

    comparisonTableBody.innerHTML = html;
  }

  /**
   * メイン計算＆レンダリング処理
   */
  function calculateAndRender() {
    const { hours, minutes, seconds, speed } = getInputs();

    // 1. 元の総秒数
    const originalTotalSec = (hours * 3600) + (minutes * 60) + seconds;
    const originalHms = secondsToHms(originalTotalSec);

    // 2. 倍速後の所要秒数 & 節約秒数
    const playbackTotalSec = originalTotalSec > 0 ? Math.round(originalTotalSec / speed) : 0;
    const savedTotalSec = Math.max(0, originalTotalSec - playbackTotalSec);

    const playbackHms = secondsToHms(playbackTotalSec);
    const savedHms = secondsToHms(savedTotalSec);

    // 3. UI表示の更新
    // キャプション
    resultSpeedCaption.textContent = `${speed.toFixed(speed % 1 === 0 ? 1 : 2)}倍速で再生した場合`;

    // 元の長さサマリー
    originalDurationSummary.textContent = formatHmsText(originalHms, false);

    // 視聴所要時間表示
    playbackDurationDisplay.innerHTML = formatHmsHtml(playbackHms);

    // 節約時間表示
    if (speed < 1.0) {
      // 1倍未満（スロー再生）の場合
      const extraSec = playbackTotalSec - originalTotalSec;
      const extraHms = secondsToHms(extraSec);
      savedDurationDisplay.innerHTML = `+${formatHmsHtml(extraHms)}`;
      savedDurationDisplay.style.color = '#f87171'; // 赤系
      rateBadge.textContent = 'スロー再生';
      rateBadge.className = 'metric-badge';
      savedSentence.textContent = `スロー再生のため、通常より約${extraHms.minutes > 0 ? extraHms.minutes + '分' : extraHms.seconds + '秒'}多く時間がかかります。`;
    } else if (speed === 1.0 || originalTotalSec === 0) {
      // 等倍または0の場合
      savedDurationDisplay.innerHTML = formatHmsHtml(savedHms);
      savedDurationDisplay.style.color = '#94a3b8';
      rateBadge.textContent = '等倍（短縮なし）';
      rateBadge.className = 'metric-badge';
      savedSentence.textContent = '等倍再生です。倍速を選択すると節約できる時間が計算されます。';
    } else {
      // 倍速再生（時短）
      savedDurationDisplay.innerHTML = formatHmsHtml(savedHms);
      savedDurationDisplay.style.color = '#34d399';

      const savedPercent = ((savedTotalSec / originalTotalSec) * 100).toFixed(1);
      rateBadge.textContent = `約 ${savedPercent}% 短縮`;
      rateBadge.className = 'metric-badge';

      let readableSavedText = '';
      if (savedHms.hours > 0) {
        readableSavedText = `${savedHms.hours}時間${savedHms.minutes}分`;
      } else if (savedHms.minutes > 0) {
        readableSavedText = `${savedHms.minutes}分`;
      } else {
        readableSavedText = `${savedHms.seconds}秒`;
      }
      savedSentence.textContent = `このコンテンツを倍速で見ると、約 ${readableSavedText} の時間を別の作業や学習、休息に使えます！`;
    }

    // 4. ビジュアル比較バーの更新
    if (originalTotalSec > 0) {
      let playRatio = (playbackTotalSec / originalTotalSec) * 100;
      let saveRatio = (savedTotalSec / originalTotalSec) * 100;

      if (speed <= 1.0) {
        playRatio = 100;
        saveRatio = 0;
        ratioPercentText.textContent = speed === 1.0 ? '100% (等倍)' : `${(100 / speed).toFixed(0)}% に延長`;
      } else {
        ratioPercentText.textContent = `${playRatio.toFixed(1)}% に短縮`;
      }

      // バーの幅を設定
      playbackBar.style.width = `${Math.min(100, playRatio)}%`;
      savedBar.style.width = `${Math.min(100, saveRatio)}%`;
    } else {
      playbackBar.style.width = '100%';
      savedBar.style.width = '0%';
      ratioPercentText.textContent = '0%';
    }

    // 5. 比較テーブルの更新
    renderComparisonTable(originalTotalSec, speed);

    // 6. プリセットボタンのアクティブ同期
    syncActivePresetButton(speed);
  }

  // ==========================================================================
  // Event Listeners
  // ==========================================================================

  // 時間・分・秒入力のリアルタイム反映
  [hoursInput, minutesInput, secondsInput].forEach(input => {
    input.addEventListener('input', () => {
      // 負数を防ぐ
      if (input.value < 0) input.value = 0;
      // 分・秒の最大値制限
      if ((input === minutesInput || input === secondsInput) && input.value > 59) {
        input.value = 59;
      }
      calculateAndRender();
    });
  });

  // プリセットボタングループのクリック
  speedButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      const speed = parseFloat(btn.dataset.speed);
      customSpeedInput.value = speed;
      customSpeedSlider.value = speed;
      syncActivePresetButton(speed);
      calculateAndRender();
    });
  });

  // カスタムスライダーの操作
  customSpeedSlider.addEventListener('input', () => {
    const val = parseFloat(customSpeedSlider.value);
    customSpeedInput.value = val;
    calculateAndRender();
  });

  // カスタム数値入力の変更
  customSpeedInput.addEventListener('input', () => {
    const val = parseFloat(customSpeedInput.value);
    if (!isNaN(val) && val >= 0.5 && val <= 3.0) {
      customSpeedSlider.value = val;
    }
    calculateAndRender();
  });

  // クイック時間プリセットチップ
  presetChips.forEach(chip => {
    chip.addEventListener('click', () => {
      const totalMinutes = parseInt(chip.dataset.timeMin, 10);
      const h = Math.floor(totalMinutes / 60);
      const m = totalMinutes % 60;

      hoursInput.value = h;
      minutesInput.value = m;
      secondsInput.value = 0;

      calculateAndRender();
    });
  });

  // リセットボタン
  if (resetBtn) {
    resetBtn.addEventListener('click', () => {
      hoursInput.value = 1;
      minutesInput.value = 0;
      secondsInput.value = 0;
      customSpeedInput.value = 1.5;
      customSpeedSlider.value = 1.5;
      calculateAndRender();
    });
  }

  // 結果コピー機能
  if (copyResultBtn) {
    copyResultBtn.addEventListener('click', async () => {
      const { hours, minutes, seconds, speed } = getInputs();
      const origSec = (hours * 3600) + (minutes * 60) + seconds;
      const playSec = origSec > 0 ? Math.round(origSec / speed) : 0;
      const savedSec = Math.max(0, origSec - playSec);

      const origStr = formatHmsText(secondsToHms(origSec), false);
      const playStr = formatHmsText(secondsToHms(playSec), false);
      const savedStr = formatHmsText(secondsToHms(savedSec), false);

      const copyText = `【動画・音声 倍速再生計算結果】
・元の長さ: ${origStr}
・再生速度: ${speed}倍速
・視聴所要時間: ${playStr}
・浮いた時間: ${savedStr}（時短）`;

      try {
        await navigator.clipboard.writeText(copyText);
        const originalText = copyBtnText.textContent;
        copyResultBtn.classList.add('copied');
        copyBtnText.textContent = 'コピーしました！';

        setTimeout(() => {
          copyResultBtn.classList.remove('copied');
          copyBtnText.textContent = originalText;
        }, 2200);
      } catch (err) {
        console.error('Failed to copy text: ', err);
      }
    });
  }

  // 初期計算実行
  calculateAndRender();
});
