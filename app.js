/**
 * 倍速再生時間計算ツール
 * Playback Speed Calculator Logic
 */

document.addEventListener('DOMContentLoaded', () => {
  // DOM Elements - Inputs
  const inputHours = document.getElementById('input-hours');
  const inputMinutes = document.getElementById('input-minutes');
  const inputSeconds = document.getElementById('input-seconds');
  const presetPills = document.querySelectorAll('.pill-btn');

  // DOM Elements - Speed Controls
  const speedButtons = document.querySelectorAll('.seg-btn');
  const speedSlider = document.getElementById('speed-slider');
  const inputCustomSpeed = document.getElementById('input-custom-speed');
  const summarySpeedBadge = document.getElementById('summary-speed-badge');

  // DOM Elements - Results
  const playbackTimeText = document.getElementById('playback-time-text');
  const playbackTotalSec = document.getElementById('playback-total-sec');
  const savedTimeText = document.getElementById('saved-time-text');
  const savedPercentBadge = document.getElementById('saved-percent-badge');

  // DOM Elements - Bar & Finish Time
  const timelineOrigText = document.getElementById('timeline-orig-text');
  const barFastFill = document.getElementById('bar-fast-fill');
  const barSavedFill = document.getElementById('bar-saved-fill');
  const finishTimeText = document.getElementById('finish-time-text');

  // DOM Elements - Actions & Toast
  const copyResultBtn = document.getElementById('copy-result-btn');
  const copyBtnText = document.getElementById('copy-btn-text');
  const resetBtn = document.getElementById('reset-btn');
  const toast = document.getElementById('toast');
  const toastMessage = document.getElementById('toast-message');

  // State
  let currentSpeed = 1.5;
  let toastTimer = null;

  /**
   * 秒数を「○時間○分○秒」または「○分○秒」にフォーマット
   * @param {number} totalSec
   * @returns {string}
   */
  function formatDuration(totalSec) {
    if (isNaN(totalSec) || totalSec <= 0) return '0分00秒';

    const h = Math.floor(totalSec / 3600);
    const m = Math.floor((totalSec % 3600) / 60);
    const s = Math.round(totalSec % 60);
    const sStr = s < 10 ? `0${s}` : `${s}`;

    if (h > 0) {
      const mStr = m < 10 ? `0${m}` : `${m}`;
      return `${h}時間${mStr}分${sStr}秒`;
    } else {
      return `${m}分${sStr}秒`;
    }
  }

  /**
   * 完了目安時刻を計算
   * @param {number} addSeconds
   * @returns {string}
   */
  function calculateFinishTime(addSeconds) {
    if (isNaN(addSeconds) || addSeconds <= 0) return '完了目安: --:--';

    const now = new Date();
    const finishDate = new Date(now.getTime() + addSeconds * 1000);

    const hours = finishDate.getHours().toString().padStart(2, '0');
    const minutes = finishDate.getMinutes().toString().padStart(2, '0');
    const isNextDay = finishDate.getDate() !== now.getDate();

    const timeStr = isNextDay ? `翌日 ${hours}:${minutes}` : `${hours}:${minutes}`;
    return `完了目安: ${timeStr}`;
  }

  /**
   * 計算実行＆UI更新
   */
  function calculateAndRender() {
    // 1. 元の秒数
    const h = Math.max(0, parseInt(inputHours.value, 10) || 0);
    const m = Math.max(0, parseInt(inputMinutes.value, 10) || 0);
    const s = Math.max(0, parseInt(inputSeconds.value, 10) || 0);
    const totalOriginalSeconds = (h * 3600) + (m * 60) + s;

    // 2. 再生速度
    let speed = parseFloat(currentSpeed);
    if (isNaN(speed) || speed <= 0) speed = 1.0;

    // 3. 計算
    let playbackSeconds = 0;
    let savedSeconds = 0;
    let savedRatioPercent = '0.0';

    if (totalOriginalSeconds > 0) {
      playbackSeconds = Math.round(totalOriginalSeconds / speed);
      if (speed >= 1.0) {
        savedSeconds = Math.max(0, totalOriginalSeconds - playbackSeconds);
        savedRatioPercent = ((savedSeconds / totalOriginalSeconds) * 100).toFixed(1);
      }
    }

    // 4. UI反映: 再生速度表示
    const speedStr = speed.toFixed(2);
    if (summarySpeedBadge) {
      summarySpeedBadge.textContent = `${speedStr}×`;
    }

    // 5. UI反映: 視聴時間
    const playbackFormatted = formatDuration(playbackSeconds);
    playbackTimeText.textContent = playbackFormatted;
    playbackTotalSec.textContent = `${playbackSeconds.toLocaleString()} 秒`;

    // 6. UI反映: 短縮時間
    if (totalOriginalSeconds === 0) {
      savedTimeText.textContent = '0分00秒';
      savedPercentBadge.textContent = '±0.0%';
    } else if (speed >= 1.0) {
      savedTimeText.textContent = formatDuration(savedSeconds);
      savedPercentBadge.textContent = `-${savedRatioPercent}%`;
    } else {
      const extraSeconds = playbackSeconds - totalOriginalSeconds;
      savedTimeText.textContent = `+${formatDuration(extraSeconds)}`;
      savedPercentBadge.textContent = `+${Math.round(((playbackSeconds / totalOriginalSeconds) - 1) * 100)}%`;
    }

    // 7. UI反映: 比較バー
    const origFormatted = formatDuration(totalOriginalSeconds);
    if (timelineOrigText) timelineOrigText.textContent = origFormatted;

    if (totalOriginalSeconds > 0) {
      if (speed >= 1.0) {
        const fastWidthPct = Math.min(100, Math.max(0, (playbackSeconds / totalOriginalSeconds) * 100));
        const savedWidthPct = Math.min(100 - fastWidthPct, Math.max(0, (savedSeconds / totalOriginalSeconds) * 100));
        barFastFill.style.width = `${fastWidthPct}%`;
        barSavedFill.style.width = `${savedWidthPct}%`;
        barSavedFill.style.display = 'block';
      } else {
        barFastFill.style.width = '100%';
        barSavedFill.style.width = '0%';
        barSavedFill.style.display = 'none';
      }
    } else {
      barFastFill.style.width = '0%';
      barSavedFill.style.width = '0%';
    }

    // 8. 完了目安時刻
    if (finishTimeText) {
      finishTimeText.textContent = calculateFinishTime(playbackSeconds);
    }

    // プリセットピルの同期
    updatePresetPillsActive(h, m, s);
  }

  /**
   * 速度の更新
   */
  function setSpeed(newSpeed, source = 'btn') {
    currentSpeed = Math.round(newSpeed * 100) / 100;

    if (source !== 'slider') {
      if (currentSpeed >= parseFloat(speedSlider.min) && currentSpeed <= parseFloat(speedSlider.max)) {
        speedSlider.value = currentSpeed;
      }
    }

    if (source !== 'input') {
      inputCustomSpeed.value = currentSpeed;
    }

    speedButtons.forEach(btn => {
      const btnSpeed = parseFloat(btn.dataset.speed);
      if (Math.abs(btnSpeed - currentSpeed) < 0.01) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    });

    calculateAndRender();
  }

  function updatePresetPillsActive(h, m, s) {
    presetPills.forEach(pill => {
      const pillH = parseInt(pill.dataset.h, 10);
      const pillM = parseInt(pill.dataset.m, 10);
      const pillS = parseInt(pill.dataset.s, 10);

      if (h === pillH && m === pillM && s === pillS) {
        pill.classList.add('active');
      } else {
        pill.classList.remove('active');
      }
    });
  }

  function showToast(msg) {
    if (toastTimer) clearTimeout(toastTimer);
    toastMessage.textContent = msg;
    toast.classList.add('show');
    toastTimer = setTimeout(() => {
      toast.classList.remove('show');
    }, 2200);
  }

  /* ==========================================================================
     Event Listeners
     ========================================================================== */

  [inputHours, inputMinutes, inputSeconds].forEach(input => {
    input.addEventListener('input', () => {
      if (input.value < 0) input.value = 0;
      calculateAndRender();
    });

    input.addEventListener('change', () => {
      if (input.value < 0 || input.value === '') input.value = 0;
      calculateAndRender();
    });
  });

  presetPills.forEach(pill => {
    pill.addEventListener('click', () => {
      inputHours.value = pill.dataset.h;
      inputMinutes.value = pill.dataset.m;
      inputSeconds.value = pill.dataset.s;
      calculateAndRender();
    });
  });

  speedButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      const speed = parseFloat(btn.dataset.speed);
      setSpeed(speed, 'btn');
    });
  });

  speedSlider.addEventListener('input', (e) => {
    setSpeed(parseFloat(e.target.value), 'slider');
  });

  inputCustomSpeed.addEventListener('input', (e) => {
    let val = parseFloat(e.target.value);
    if (!isNaN(val) && val > 0) {
      setSpeed(val, 'input');
    }
  });

  inputCustomSpeed.addEventListener('change', (e) => {
    let val = parseFloat(e.target.value);
    if (isNaN(val) || val <= 0) {
      val = 1.0;
    } else if (val > 10.0) {
      val = 10.0;
    }
    inputCustomSpeed.value = val;
    setSpeed(val, 'input');
  });

  // 結果コピー
  copyResultBtn.addEventListener('click', async () => {
    const h = parseInt(inputHours.value, 10) || 0;
    const m = parseInt(inputMinutes.value, 10) || 0;
    const s = parseInt(inputSeconds.value, 10) || 0;
    const origTotalSec = (h * 3600) + (m * 60) + s;

    const speedStr = currentSpeed.toFixed(2);
    const origStr = formatDuration(origTotalSec);
    const playbackStr = playbackTimeText.textContent.trim();
    const savedStr = savedTimeText.textContent.trim();
    const savedPct = savedPercentBadge.textContent.trim();
    const finishAt = finishTimeText.textContent.replace('完了目安: ', '').trim();

    const textToCopy = [
      `倍速再生時間 計算結果`,
      `・元の長さ: ${origStr}`,
      `・再生速度: ${speedStr}x`,
      `・視聴時間: ${playbackStr}`,
      `・短縮時間: ${savedStr} (${savedPct})`,
      `・完了目安: ${finishAt}`
    ].join('\n');

    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(textToCopy);
      } else {
        const textarea = document.createElement('textarea');
        textarea.value = textToCopy;
        textarea.style.position = 'fixed';
        textarea.style.opacity = '0';
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
      }

      copyBtnText.textContent = 'コピー完了';
      showToast('クリップボードにコピーしました');
      setTimeout(() => {
        copyBtnText.textContent = '結果をコピー';
      }, 1800);
    } catch (err) {
      console.error('Copy failed:', err);
      showToast('コピーできませんでした');
    }
  });

  // リセット
  resetBtn.addEventListener('click', () => {
    inputHours.value = 0;
    inputMinutes.value = 30;
    inputSeconds.value = 0;
    setSpeed(1.5, 'btn');
    showToast('初期設定に戻しました');
  });

  // 1分毎の完了時刻更新
  setInterval(() => {
    const h = parseInt(inputHours.value, 10) || 0;
    const m = parseInt(inputMinutes.value, 10) || 0;
    const s = parseInt(inputSeconds.value, 10) || 0;
    const totalOriginalSeconds = (h * 3600) + (m * 60) + s;
    const speed = parseFloat(currentSpeed) || 1.0;
    const playbackSeconds = Math.round(totalOriginalSeconds / speed);
    finishTimeText.textContent = calculateFinishTime(playbackSeconds);
  }, 60000);

  // 初期計算
  calculateAndRender();

  /* ==========================================================================
     PWA & Mobile Features
     ========================================================================== */

  // Service Worker
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('./sw.js').catch(() => {});
    });
  }

  // PWA Install
  let deferredPrompt = null;
  const pwaInstallBtn = document.getElementById('pwa-install-btn');
  const installModal = document.getElementById('install-modal');
  const closeInstallModalBtn = document.getElementById('close-install-modal');
  const modalConfirmBtn = document.getElementById('modal-confirm-btn');

  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
  });

  if (pwaInstallBtn) {
    pwaInstallBtn.addEventListener('click', async () => {
      if (deferredPrompt) {
        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        if (outcome === 'accepted') {
          showToast('インストールを開始しました');
        }
        deferredPrompt = null;
      } else {
        openInstallModal();
      }
    });
  }

  window.addEventListener('appinstalled', () => {
    showToast('インストールが完了しました');
    if (pwaInstallBtn) pwaInstallBtn.style.display = 'none';
  });

  function openInstallModal() {
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
    const iosBox = document.getElementById('ios-step-box');
    const androidBox = document.getElementById('android-step-box');

    if (isIOS) {
      if (iosBox) iosBox.style.display = 'block';
      if (androidBox) androidBox.style.display = 'none';
    } else {
      if (iosBox) iosBox.style.display = 'block';
      if (androidBox) androidBox.style.display = 'block';
    }

    if (installModal) installModal.classList.add('active');
  }

  function closeInstallModal() {
    if (installModal) installModal.classList.remove('active');
  }

  if (closeInstallModalBtn) closeInstallModalBtn.addEventListener('click', closeInstallModal);
  if (modalConfirmBtn) modalConfirmBtn.addEventListener('click', closeInstallModal);
  if (installModal) {
    installModal.addEventListener('click', (e) => {
      if (e.target === installModal) closeInstallModal();
    });
  }

  // QR Modal
  const openQrBtn = document.getElementById('open-qr-btn');
  const qrModal = document.getElementById('qr-modal');
  const closeQrModalBtn = document.getElementById('close-qr-modal');
  const closeQrBtn = document.getElementById('close-qr-btn');
  const qrContainer = document.getElementById('qr-container');
  const qrUrlDisplay = document.getElementById('qr-url-display');

  function openQrModal() {
    const shareUrl = window.location.href;
    if (qrUrlDisplay) qrUrlDisplay.textContent = shareUrl;

    if (qrContainer) {
      const qrApiUrl = `https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=${encodeURIComponent(shareUrl)}`;
      qrContainer.innerHTML = `<img src="${qrApiUrl}" alt="QR Code" width="160" height="160" style="display:block;border-radius:4px;" onerror="this.onerror=null;this.parentElement.innerHTML='<p style=\\'font-size:12px;color:#333;padding:10px;\\'>URL: ${shareUrl}</p>'">`;
    }

    if (qrModal) qrModal.classList.add('active');
  }

  function closeQrModal() {
    if (qrModal) qrModal.classList.remove('active');
  }

  if (openQrBtn) openQrBtn.addEventListener('click', openQrModal);
  if (closeQrModalBtn) closeQrModalBtn.addEventListener('click', closeQrModal);
  if (closeQrBtn) closeQrBtn.addEventListener('click', closeQrModal);
  if (qrModal) {
    qrModal.addEventListener('click', (e) => {
      if (e.target === qrModal) closeQrModal();
    });
  }
});
