// BPM Detection via Web Audio API
// Records from microphone, analyzes onset intervals to estimate BPM.
// Fully local — no external API, works offline.

const RECORD_DURATION_MS = 10000; // 10 seconds
const SAMPLE_RATE = 44100;

// Simple onset-based BPM estimator using energy peaks
function estimateBpm(audioBuffer) {
  const channelData = audioBuffer.getChannelData(0);
  const sampleRate = audioBuffer.sampleRate;

  // Compute energy in overlapping windows (~50ms hop)
  const windowSize = Math.round(sampleRate * 0.05);
  const hopSize = Math.round(windowSize / 2);
  const energies = [];

  for (let i = 0; i + windowSize < channelData.length; i += hopSize) {
    let sum = 0;
    for (let j = 0; j < windowSize; j++) {
      sum += channelData[i + j] ** 2;
    }
    energies.push(sum / windowSize);
  }

  // Detect onsets: energy spikes above local average
  const onsetIndices = [];
  const windowFrames = 20;

  for (let i = windowFrames; i < energies.length - windowFrames; i++) {
    const localAvg =
      energies.slice(i - windowFrames, i).reduce((a, b) => a + b, 0) /
      windowFrames;
    const threshold = localAvg * 1.5;
    if (
      energies[i] > threshold &&
      energies[i] > energies[i - 1] &&
      energies[i] > energies[i + 1]
    ) {
      // Ensure minimum gap between onsets (~0.2s)
      const minGapFrames = Math.round(0.2 / (hopSize / sampleRate));
      if (
        onsetIndices.length === 0 ||
        i - onsetIndices[onsetIndices.length - 1] > minGapFrames
      ) {
        onsetIndices.push(i);
      }
    }
  }

  if (onsetIndices.length < 4) return null;

  // Convert onset frame indices to seconds
  const hopSeconds = hopSize / sampleRate;
  const onsetTimes = onsetIndices.map((i) => i * hopSeconds);

  // Compute inter-onset intervals
  const intervals = [];
  for (let i = 1; i < onsetTimes.length; i++) {
    intervals.push(onsetTimes[i] - onsetTimes[i - 1]);
  }

  // Find the most common interval via histogram (50ms buckets)
  const bucketSize = 0.05;
  const buckets = {};
  for (const iv of intervals) {
    if (iv < 0.25 || iv > 2.0) continue; // 30–240 BPM range
    const bucket = Math.round(iv / bucketSize) * bucketSize;
    buckets[bucket] = (buckets[bucket] || 0) + 1;
  }

  const entries = Object.entries(buckets);
  if (entries.length === 0) return null;

  entries.sort((a, b) => b[1] - a[1]);
  const bestInterval = parseFloat(entries[0][0]);
  const bpm = Math.round(60 / bestInterval);

  // Sanity check: BPM should be in 60–200 range
  if (bpm < 60 || bpm > 200) return null;
  return bpm;
}

// Main export: record from mic for RECORD_DURATION_MS, return detected BPM or null
export async function detectBpmFromMic(onProgress) {
  // Request microphone access
  let stream;
  try {
    stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
  } catch (err) {
    throw new Error('Microphone access denied: ' + err.message);
  }

  return new Promise((resolve, reject) => {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    const ctx = new AudioContext({ sampleRate: SAMPLE_RATE });

    const chunks = [];
    const mediaRecorder = new MediaRecorder(stream);

    mediaRecorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunks.push(e.data);
    };

    mediaRecorder.onstop = async () => {
      // Stop all mic tracks
      stream.getTracks().forEach((t) => t.stop());

      try {
        const blob = new Blob(chunks, { type: 'audio/webm' });
        const arrayBuffer = await blob.arrayBuffer();
        const audioBuffer = await ctx.decodeAudioData(arrayBuffer);
        await ctx.close();
        const bpm = estimateBpm(audioBuffer);
        resolve(bpm);
      } catch (err) {
        await ctx.close();
        reject(new Error('BPM analysis failed: ' + err.message));
      }
    };

    mediaRecorder.onerror = (e) => {
      stream.getTracks().forEach((t) => t.stop());
      reject(new Error('Recording error: ' + e.error));
    };

    mediaRecorder.start(100); // collect in 100ms chunks

    // Progress callbacks
    const startTime = Date.now();
    const progressInterval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const pct = Math.min(100, Math.round((elapsed / RECORD_DURATION_MS) * 100));
      if (onProgress) onProgress(pct);
      if (elapsed >= RECORD_DURATION_MS) {
        clearInterval(progressInterval);
      }
    }, 200);

    setTimeout(() => {
      clearInterval(progressInterval);
      if (mediaRecorder.state !== 'inactive') {
        mediaRecorder.stop();
      }
    }, RECORD_DURATION_MS);
  });
}
