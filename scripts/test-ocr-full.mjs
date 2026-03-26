
import { extractPdfPagesWithOcr } from '../lib/ocr.js';
import fs from 'node:fs';
import path from 'node:path';

// Find a PDF to test with
const testPdfPath = 'c:/Users/Agam Pathak/OneDrive/Desktop/PROJECT/TMS/lexora-ai/.lexora/users/7ff132d2-682f-4cb3-b4d4-c1a2360816c2/uploads/resume-1773846962837.pdf';

async function test() {
  if (!fs.existsSync(testPdfPath)) {
    console.log('No test PDF found at ' + testPdfPath);
    // Try another path
    const legacyPath = 'c:/Users/Agam Pathak/OneDrive/Desktop/PROJECT/TMS/lexora-ai/public/uploads/7ff132d2-682f-4cb3-b4d4-c1a2360816c2/resume-1773846962837.pdf';
    if (!fs.existsSync(legacyPath)) {
       console.log('No legacy PDF found');
       return;
    }
  }

  const pdfData = new Uint8Array(fs.readFileSync(testPdfPath));
  
  try {
    const results = await extractPdfPagesWithOcr(pdfData, [1]);
    console.log('OCR Result for Page 1:', results[0]?.text.slice(0, 50) + '...');
    console.log('SUCCESS: OCR triggered and returned text.');
  } catch (e) {
    console.error('OCR CRITICAL FAILURE:', e);
  }
}

test();
