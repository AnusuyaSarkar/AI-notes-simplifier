import * as pdfjsLib from 'https://cdn.jsdelivr.net/npm/pdfjs-dist@4.4.168/build/pdf.min.mjs';

const noteInput = document.getElementById('noteInput');
const summarizeBtn = document.getElementById('summarizeBtn');
const copyBtn = document.getElementById('copyBtn');
const loadSampleBtn = document.getElementById('loadSample');
const pdfUpload = document.getElementById('pdfUpload');
const pdfFileName = document.getElementById('pdfFileName');
const summarySize = document.getElementById('summarySize');
const summarySizeLabel = document.getElementById('summarySizeLabel');
const summaryText = document.getElementById('summaryText');
const conceptList = document.getElementById('conceptList');
const takeawayList = document.getElementById('takeawayList');
const statusText = document.getElementById('statusText');
const wordCount = document.getElementById('wordCount');
const sentenceCount = document.getElementById('sentenceCount');
const summaryLength = document.getElementById('summaryLength');
const downloadPdfBtn = document.getElementById('downloadPdfBtn');

pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdn.jsdelivr.net/npm/pdfjs-dist@4.4.168/build/pdf.worker.min.mjs';

const SAMPLE_NOTE = `Photosynthesis is the process by which plants convert light energy into chemical energy. Chlorophyll in the chloroplast absorbs sunlight and uses it to combine carbon dioxide and water into glucose and oxygen. The glucose is then stored or used for growth, repair, and respiration. Photosynthesis is essential because it supports plant life and provides oxygen for most living organisms. The process happens in two stages: the light-dependent reactions and the Calvin cycle. In the light-dependent reactions, sunlight splits water molecules and produces ATP and NADPH. In the Calvin cycle, carbon dioxide is turned into sugar using that energy. Factors such as light intensity, carbon dioxide levels, temperature, and water availability can affect the rate of photosynthesis.`;

const STOP_WORDS = new Set([
  'a', 'an', 'and', 'are', 'as', 'at', 'be', 'because', 'been', 'but', 'by', 'can', 'could', 'did', 'do',
  'does', 'for', 'from', 'had', 'has', 'have', 'he', 'her', 'here', 'him', 'his', 'how', 'i', 'if', 'in',
  'into', 'is', 'it', 'its', 'just', 'like', 'may', 'might', 'more', 'most', 'not', 'of', 'on', 'or', 'our',
  'out', 'over', 'she', 'should', 'so', 'some', 'such', 'than', 'that', 'the', 'their', 'them', 'then',
  'there', 'these', 'they', 'this', 'to', 'too', 'under', 'up', 'was', 'we', 'were', 'what', 'when', 'where',
  'which', 'who', 'will', 'with', 'would', 'you', 'your'
]);

summarySizeLabel.textContent = `${summarySize.value} sentences`;
summaryLength.textContent = summarySize.value;

let lastResult = null;

const sampleSummary = summarizeText(SAMPLE_NOTE, Number(summarySize.value));
renderResult(sampleSummary, 'Sample note loaded. Review the summary or replace it with your own note.');
noteInput.value = SAMPLE_NOTE;
updateCounts(SAMPLE_NOTE);

noteInput.addEventListener('input', () => {
  updateCounts(noteInput.value);
});

// Auto-summarize when the user stops typing for a short period
let _autoTimer = null;
noteInput.addEventListener('input', () => {
  clearTimeout(_autoTimer);
  _autoTimer = setTimeout(() => {
    const text = noteInput.value.trim();
    if (!text) {
      return;
    }

    const result = summarizeText(text, Number(summarySize.value));
    renderResult(result, `Auto-summarized ${result.sentencesUsed} important sentences.`);
  }, 1200);
});

summarySize.addEventListener('input', () => {
  summarySizeLabel.textContent = `${summarySize.value} sentences`;
  summaryLength.textContent = summarySize.value;
});

loadSampleBtn.addEventListener('click', () => {
  noteInput.value = SAMPLE_NOTE;
  updateCounts(SAMPLE_NOTE);
  const result = summarizeText(SAMPLE_NOTE, Number(summarySize.value));
  renderResult(result, 'Sample note loaded and summarized.');
});

const summarizePdfBtn = document.getElementById('summarizePdfBtn');

pdfUpload.addEventListener('change', () => {
  const file = pdfUpload.files?.[0];
  if (!file) {
    pdfFileName.textContent = 'No PDF selected.';
    return;
  }

  if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
    statusText.textContent = 'Please choose a PDF file.';
    pdfUpload.value = '';
    pdfFileName.textContent = 'No PDF selected.';
    return;
  }

  pdfFileName.textContent = file.name;
  statusText.textContent = 'PDF selected. Click "Summarize PDF" to extract and summarize.';
});

summarizePdfBtn.addEventListener('click', async () => {
  const file = pdfUpload.files?.[0];
  if (!file) {
    statusText.textContent = 'No PDF selected. Choose a PDF first.';
    return;
  }

  summarizePdfBtn.disabled = true;
  summarizePdfBtn.textContent = 'Summarizing...';
  statusText.textContent = `Extracting text from ${file.name}...`;

  try {
    const extractedText = await extractTextFromPdf(file);
    noteInput.value = extractedText;
    updateCounts(extractedText);
    const result = summarizeText(extractedText, Number(summarySize.value));
    renderResult(result, `Summarized PDF: ${file.name}`);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to read or summarize the PDF.';
    renderEmptyState(message);
  } finally {
    summarizePdfBtn.disabled = false;
    summarizePdfBtn.textContent = 'Summarize PDF';
  }
});

summarizeBtn.addEventListener('click', () => {
  const text = noteInput.value.trim();
  if (!text) {
    renderEmptyState('Paste a note first, then summarize it.');
    return;
  }

  const result = summarizeText(text, Number(summarySize.value));
  renderResult(result, `Summarized ${result.sentencesUsed} important sentences from your note.`);
});

copyBtn.addEventListener('click', async () => {
  const summary = summaryText.textContent?.trim();
  if (!summary || summary === 'Add a note to generate the summary.') {
    statusText.textContent = 'Nothing to copy yet. Generate a summary first.';
    return;
  }

  const concepts = [...conceptList.querySelectorAll('li')].map((item) => `- ${item.textContent}`);
  const takeaways = [...takeawayList.querySelectorAll('li')].map((item) => `- ${item.textContent}`);
  const payload = [`Summary: ${summary}`, '', 'Key concepts:', ...concepts, '', 'Takeaways:', ...takeaways].join('\n');

  try {
    await navigator.clipboard.writeText(payload);
    statusText.textContent = 'Summary copied to clipboard.';
  } catch {
    statusText.textContent = 'Clipboard access is blocked in this browser. You can still select and copy the summary manually.';
  }
});

function renderEmptyState(message) {
  summaryText.textContent = 'Add a note to generate the summary.';
  conceptList.innerHTML = '';
  takeawayList.innerHTML = '';
  statusText.textContent = message;
}

function renderResult(result, statusMessage) {
  // Render the main summary: if it contains multiple sentences, show them as numbered points for clarity
  const summaryStr = typeof result.summary === 'string' ? result.summary.trim() : String(result.summary);
  const summarySentences = splitSentences(summaryStr);
  const concepts = result.concepts ?? [];

  if (summarySentences.length > 0) {
    // For each sentence, chunk it into shorter pieces and highlight concept keywords
    const bullets = [];
    for (const sentence of summarySentences) {
      const chunks = chunkText(sentence, 120);
      for (const chunk of chunks) {
        bullets.push(highlightConcepts(chunk, concepts));
      }
    }

    summaryText.innerHTML = `<ul class="summary-points">${bullets.map((html) => `<li>${html}</li>`).join('')}</ul>`;
  } else {
    summaryText.textContent = 'Add a note to generate the summary.';
  }
  conceptList.innerHTML = result.concepts.map((item) => `<li>${escapeHtml(item)}</li>`).join('');
  takeawayList.innerHTML = result.takeaways.map((item) => `<li>${escapeHtml(item)}</li>`).join('');
  statusText.textContent = statusMessage;

    lastResult = result;
}

function updateCounts(text) {
  const words = extractWords(text);
  const sentences = splitSentences(text);
  wordCount.textContent = words.length.toString();
  sentenceCount.textContent = sentences.length.toString();
}

async function extractTextFromPdf(file) {
  const data = await file.arrayBuffer();
  const document = await pdfjsLib.getDocument({ data, disableWorker: true }).promise;
  const pages = [];

  for (let pageNumber = 1; pageNumber <= document.numPages; pageNumber += 1) {
    const page = await document.getPage(pageNumber);
    const content = await page.getTextContent();
    const pageText = content.items
      .map((item) => ('str' in item ? item.str : ''))
      .join(' ')
      .replace(/\s+/g, ' ')
      .trim();

    if (pageText) {
      pages.push(pageText);
    }
  }

  const text = pages.join('\n\n').trim();
  if (!text) {
    throw new Error('The PDF did not contain readable text.');
  }

  return text;
}

function summarizeText(text, targetSentenceCount) {
  const sentences = splitSentences(text);
  const words = extractWords(text);

  if (sentences.length === 0) {
    return {
      summary: 'The note does not contain enough sentence structure for summarization.',
      concepts: [],
      takeaways: ['Add more complete sentences or paragraphs for a stronger result.'],
      sentencesUsed: 0,
    };
  }

  if (sentences.length <= 2) {
    const joined = sentences.join(' ');
    return {
      summary: joined,
      concepts: extractConceptPhrases(text, 5),
      takeaways: buildTakeaways(sentences, extractConceptPhrases(text, 3)),
      sentencesUsed: sentences.length,
    };
  }

  const wordFrequency = buildWordFrequency(words);
  const sentenceScores = sentences.map((sentence, index) => ({
    index,
    sentence,
    score: scoreSentence(sentence, wordFrequency),
  }));

  const chosen = sentenceScores
    .slice()
    .sort((left, right) => right.score - left.score)
    .slice(0, Math.min(targetSentenceCount, sentences.length))
    .sort((left, right) => left.index - right.index)
    .map((item) => item.sentence);

  const summary = chosen.join(' ');
  const concepts = extractConceptPhrases(text, 6);
  const takeaways = buildTakeaways(chosen, concepts.slice(0, 3));

  return {
    summary,
    concepts,
    takeaways,
    sentencesUsed: chosen.length,
  };
}

function splitSentences(text) {
  return text
    .replace(/\s+/g, ' ')
    .split(/(?<=[.!?])\s+|\n+/)
    .map((sentence) => sentence.trim())
    .filter(Boolean);
}

function extractWords(text) {
  return text.toLowerCase().match(/[a-z']{3,}/g)?.filter((word) => !STOP_WORDS.has(word)) ?? [];
}

function buildWordFrequency(words) {
  const frequency = new Map();
  for (const word of words) {
    frequency.set(word, (frequency.get(word) ?? 0) + 1);
  }
  return frequency;
}

function scoreSentence(sentence, frequency) {
  const words = extractWords(sentence);
  if (words.length === 0) {
    return 0;
  }

  const total = words.reduce((sum, word) => sum + (frequency.get(word) ?? 0), 0);
  const lengthPenalty = 1 + Math.abs(words.length - 18) / 18;
  return total / lengthPenalty;
}

function topKeywords(words, limit) {
  const frequency = buildWordFrequency(words);
  return [...frequency.entries()]
    .sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0]))
    .slice(0, limit)
    .map(([word]) => capitalize(word));
}

function extractConceptPhrases(text, limit) {
  const candidates = new Map();
  const sentences = splitSentences(text);

  for (const sentence of sentences) {
    const terms = sentence.toLowerCase().match(/[a-z']{3,}/g)?.filter((word) => !STOP_WORDS.has(word)) ?? [];

    for (let index = 0; index < terms.length; index += 1) {
      const unigram = terms[index];
      if (unigram) {
        candidates.set(unigram, (candidates.get(unigram) ?? 0) + 1);
      }

      const bigram = terms[index + 1] ? `${terms[index]} ${terms[index + 1]}` : '';
      if (bigram) {
        candidates.set(bigram, (candidates.get(bigram) ?? 0) + 1.35);
      }

      const trigram = terms[index + 2] ? `${terms[index]} ${terms[index + 1]} ${terms[index + 2]}` : '';
      if (trigram) {
        candidates.set(trigram, (candidates.get(trigram) ?? 0) + 1.7);
      }
    }
  }

  return [...candidates.entries()]
    .sort((left, right) => right[1] - left[1] || right[0].length - left[0].length)
    .map(([phrase]) => phrase)
    .filter((phrase, index, list) => {
      const normalized = phrase.toLowerCase();
      return list.findIndex((candidate) => candidate.toLowerCase() === normalized) === index;
    })
    .filter((phrase, index, list) => {
      const normalized = phrase.toLowerCase();
      return !list.some((candidate, candidateIndex) => {
        if (candidateIndex >= index) {
          return false;
        }

        const candidateNormalized = candidate.toLowerCase();
        return candidateNormalized.includes(normalized) || normalized.includes(candidateNormalized);
      });
    })
    .slice(0, limit)
    .map((phrase) => titleCasePhrase(phrase));
}

function buildTakeaways(sentences, concepts) {
  const takeaways = [];
  if (sentences.length > 0) {
    takeaways.push(`Focus on ${concepts[0] ?? 'the main idea'} and how it connects to the rest of the note.`);
  }
  if (sentences.length > 1) {
    takeaways.push(`Remember the process or sequence described in the note.`);
  }
  if (sentences.length > 2) {
    takeaways.push(`Watch for the conditions, examples, or factors that affect ${concepts[1] ?? 'the topic'}.`);
  }
  return takeaways.slice(0, 3);
}

function capitalize(value) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function titleCasePhrase(phrase) {
  return phrase
    .split(' ')
    .map((part) => capitalize(part))
    .join(' ');
}

function escapeHtml(value) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function chunkText(text, maxLen = 120) {
  const words = text.split(/\s+/).filter(Boolean);
  const chunks = [];
  let current = '';

  for (const word of words) {
    if ((current + ' ' + word).trim().length <= maxLen) {
      current = (current + ' ' + word).trim();
    } else {
      if (current) chunks.push(current);
      current = word;
    }
  }
  if (current) chunks.push(current);
  return chunks;
}

function highlightConcepts(text, concepts) {
  if (!concepts || concepts.length === 0) return escapeHtml(text);

  // sort concepts by length desc to match longer phrases first
  const sorted = [...concepts].sort((a, b) => b.length - a.length).map((c) => c.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
  const pattern = new RegExp(`\\b(${sorted.join('|')})\\b`, 'ig');

  const parts = [];
  let lastIndex = 0;
  let match;
  while ((match = pattern.exec(text)) !== null) {
    const before = text.slice(lastIndex, match.index);
    if (before) parts.push(escapeHtml(before));
    parts.push(`<strong>${escapeHtml(match[0])}</strong>`);
    lastIndex = match.index + match[0].length;
  }
  if (lastIndex < text.length) parts.push(escapeHtml(text.slice(lastIndex)));
  return parts.join('');
}

downloadPdfBtn.addEventListener('click', () => {
  if (!lastResult) {
    statusText.textContent = 'No summary available to download.';
    return;
  }

  try {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    const margin = 14;
    const pageWidth = doc.internal.pageSize.getWidth();
    const maxWidth = pageWidth - margin * 2;
    let y = 20;

    doc.setFontSize(16);
    doc.text('Summary', margin, y);
    y += 8;
    doc.setLineWidth(0.3);
    y += 6;

    doc.setFontSize(12);

    // Render main summary bullets
    const summaryStr = typeof lastResult.summary === 'string' ? lastResult.summary : String(lastResult.summary);
    const sentences = splitSentences(summaryStr);
    for (const sentence of sentences) {
      const chunks = chunkText(sentence, 100);
      for (const chunk of chunks) {
        const lines = doc.splitTextToSize(chunk, maxWidth);
        y = addWrappedText(doc, lines, margin + 4, y, 10);
      }
      y += 4;
    }

    y += 6;
    doc.setFontSize(13);
    doc.text('Key concepts:', margin, y);
    y += 6;
    doc.setFontSize(11);
    for (const concept of lastResult.concepts ?? []) {
      const lines = doc.splitTextToSize('- ' + concept, maxWidth);
      y = addWrappedText(doc, lines, margin + 4, y, 8);
    }

    y += 6;
    doc.setFontSize(13);
    doc.text('Takeaways:', margin, y);
    y += 6;
    doc.setFontSize(11);
    for (const t of lastResult.takeaways ?? []) {
      const lines = doc.splitTextToSize('- ' + t, maxWidth);
      y = addWrappedText(doc, lines, margin + 4, y, 8);
    }

    // filename
    const fileName = `summary.pdf`;
    doc.save(fileName);
    statusText.textContent = `Summary PDF generated (${fileName}).`;
  } catch (err) {
    statusText.textContent = 'Failed to generate PDF: ' + (err instanceof Error ? err.message : String(err));
  }
});

function addWrappedText(doc, lines, x, y, lineHeight = 8) {
  const pageHeight = doc.internal.pageSize.getHeight();
  for (const line of Array.isArray(lines) ? lines : [lines]) {
    if (y > pageHeight - 20) {
      doc.addPage();
      y = 20;
    }
    doc.text(line, x, y);
    y += lineHeight;
  }
  return y;
}
