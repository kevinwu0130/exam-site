import * as pdfjsLib from 'pdfjs-dist'

pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url
).toString()

async function extractItems(arrayBuffer) {
  const pdf = await pdfjsLib.getDocument({ data: new Uint8Array(arrayBuffer) }).promise
  const allItems = []

  for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
    const page = await pdf.getPage(pageNum)
    const viewport = page.getViewport({ scale: 1 })
    const content = await page.getTextContent()
    const pageHeight = viewport.height

    for (const item of content.items) {
      if (!item.str.trim()) continue
      allItems.push({
        str: item.str,
        x: item.transform[4],
        y: pageHeight - item.transform[5],
        page: pageNum,
      })
    }
  }
  return allItems
}

function groupLines(items, tol = 3) {
  const sorted = [...items].sort((a, b) => a.page - b.page || a.y - b.y || a.x - b.x)
  const lines = []
  let cur = [], curY = null, curPage = null

  for (const item of sorted) {
    if (curY === null || item.page !== curPage || Math.abs(item.y - curY) > tol) {
      if (cur.length) lines.push(cur)
      cur = [item]
      curY = item.y
      curPage = item.page
    } else {
      cur.push(item)
    }
  }
  if (cur.length) lines.push(cur)
  return lines
}

// Anchor thresholds on the 答案 header x position (consistently placed)
function detectThresholds(lines) {
  for (const line of lines) {
    const text = line.map(i => i.str).join('')
    if (text.includes('編號') && text.includes('題目') && text.includes('答案') && text.includes('解析')) {
      const sorted = [...line].sort((a, b) => a.x - b.x)
      const ansItem = sorted.find(i => i.str.includes('答案'))
      if (ansItem) {
        const ansX = ansItem.x
        return {
          numRight: ansX * 0.22,  // ~78 for ansX=354
          qRight:   ansX - 14,    // ~341 — option labels stay in q column (max observed: 340)
          ansRight: ansX + 18,    // ~373 — explanation starts at ~373.8
        }
      }
    }
  }
  return { numRight: 78, qRight: 340, ansRight: 373 }
}

function classifyLine(line, { numRight, qRight, ansRight }) {
  // Sort by x so that sub-line items (slightly different y within tolerance)
  // are joined in reading order (left to right), not by y-then-x.
  const sorted = [...line].sort((a, b) => a.x - b.x)
  const num = sorted.filter(i => i.x < numRight).map(i => i.str).join('').trim()
  const q   = sorted.filter(i => i.x >= numRight && i.x < qRight).map(i => i.str).join(' ').trim()
  const ans = sorted.filter(i => i.x >= qRight && i.x < ansRight).map(i => i.str).join('').trim()
  const exp = sorted.filter(i => i.x >= ansRight).map(i => i.str).join(' ').trim()
  return { num, q, ans, exp, y: line[0]?.y ?? 0, page: line[0]?.page ?? 1 }
}

function isMetaRow(row) {
  const all = row.num + row.q + row.ans + row.exp
  return (
    (row.q.includes('題目') && (row.ans.includes('答案') || row.exp.includes('解析'))) ||
    row.num.includes('編號') ||
    /「?L\d{5}/.test(row.num + row.q) ||
    /練習|燦哥|V7|2026\.0|模擬考題|iPas/.test(all) ||
    /^\d{4}\/\d{1,2}\/\d{1,2}$/.test(all.trim()) ||
    (/^\d{1,2}$/.test(all.trim()) && !row.q && !row.ans && !row.num.match(/\d{1,3}/))
  )
}

function parseBody(raw) {
  const text = raw.replace(/\s+/g, ' ').trim()
  const m = text.match(/^(.*?)\s*\(A\)\s*(.*?)\s*\(B\)\s*(.*?)\s*\(C\)\s*(.*?)\s*\(D\)\s*(.*?)[\s。.]*$/)
  if (!m) return null
  return {
    stem: m[1].trim(),
    options: [
      m[2].trim(),
      m[3].trim(),
      m[4].trim(),
      m[5].replace(/[。.]\s*$/, '').trim(),
    ],
  }
}

export async function parsePDF(arrayBuffer) {
  const items = await extractItems(arrayBuffer)
  const lines = groupLines(items)
  const thresholds = detectThresholds(lines)

  // Classify rows and filter meta rows
  const rows = lines
    .map(line => classifyLine(line, thresholds))
    .filter(r => !isMetaRow(r))

  if (rows.length === 0) throw new Error('無法識別題目格式')

  // Find all numbered rows (question anchors)
  const numberedRows = rows
    .filter(r => /^\d{1,3}$/.test(r.num.trim()))
    .sort((a, b) => a.page - b.page || a.y - b.y)

  if (numberedRows.length === 0) throw new Error('未找到任何題目編號')

  // Group rows by question using Voronoi assignment:
  // Each non-numbered row is assigned to the nearest numbered row on the same page.
  // This correctly handles small blank lines between questions.
  const blockMap = new Map()
  numberedRows.forEach((nr, ni) => blockMap.set(ni, [nr]))

  for (const row of rows) {
    if (/^\d{1,3}$/.test(row.num.trim())) continue

    let bestNi = -1, bestDist = Infinity
    for (let ni = 0; ni < numberedRows.length; ni++) {
      const nr = numberedRows[ni]
      if (nr.page !== row.page) continue
      const dist = Math.abs(nr.y - row.y)
      if (dist < bestDist) { bestDist = dist; bestNi = ni }
    }

    // Only assign if within 60pt of some question number (avoids stray meta rows)
    if (bestNi >= 0 && bestDist < 60) {
      blockMap.get(bestNi).push(row)
    }
  }

  // Parse each question block
  const questions = []

  for (const [, block] of blockMap) {
    block.sort((a, b) => a.y - b.y)

    const qText  = block.map(r => r.q).filter(Boolean).join(' ').replace(/\s+/g, ' ').trim()
    const expText = block.map(r => r.exp).filter(Boolean).join(' ').replace(/\s+/g, ' ').trim()

    let ansLetter = null
    for (const r of block) {
      const m = r.ans.match(/\(([ABCD])\)/)
      if (m) { ansLetter = m[1]; break }
    }
    if (!ansLetter) {
      const m = qText.match(/\(D\)[^(]*[。.\s]+\(([ABCD])\)\s*$/)
      if (m) ansLetter = m[1]
    }
    if (!ansLetter) continue

    const parsed = parseBody(qText)
    if (!parsed || parsed.options.some(o => !o)) continue

    questions.push({
      body: parsed.stem,
      options: parsed.options,
      answer: 'ABCD'.indexOf(ansLetter),
      explanation: expText,
    })
  }

  if (questions.length === 0) throw new Error('未能解析出任何題目，請確認 PDF 格式正確')
  return questions
}
