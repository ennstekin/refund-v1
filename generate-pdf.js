const mdToPdf = require('md-to-pdf').mdToPdf;
const fs = require('fs');
const path = require('path');

async function generatePDF() {
  try {
    console.log('📄 PDF oluşturuluyor...');
    
    const pdf = await mdToPdf(
      { path: 'ARCHITECTURE.md' },
      {
        dest: 'ARCHITECTURE.pdf',
        launch_options: { args: ['--no-sandbox'] },
        pdf_options: {
          format: 'A4',
          margin: {
            top: '20mm',
            right: '20mm',
            bottom: '20mm',
            left: '20mm'
          },
          printBackground: true,
        },
        stylesheet: `
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            font-size: 11pt;
            line-height: 1.6;
            color: #333;
          }
          h1 {
            color: #2563eb;
            border-bottom: 3px solid #2563eb;
            padding-bottom: 10px;
            page-break-before: always;
          }
          h1:first-of-type {
            page-break-before: avoid;
          }
          h2 {
            color: #1e40af;
            border-bottom: 2px solid #93c5fd;
            padding-bottom: 8px;
            margin-top: 30px;
          }
          h3 {
            color: #1e3a8a;
            margin-top: 20px;
          }
          code {
            background: #f3f4f6;
            padding: 2px 6px;
            border-radius: 3px;
            font-family: 'Courier New', monospace;
            font-size: 10pt;
          }
          pre {
            background: #1f2937;
            color: #f3f4f6;
            padding: 15px;
            border-radius: 6px;
            overflow-x: auto;
            font-size: 9pt;
            line-height: 1.4;
          }
          pre code {
            background: transparent;
            color: inherit;
            padding: 0;
          }
          blockquote {
            border-left: 4px solid #3b82f6;
            padding-left: 15px;
            margin-left: 0;
            color: #4b5563;
            font-style: italic;
          }
          table {
            border-collapse: collapse;
            width: 100%;
            margin: 20px 0;
          }
          th, td {
            border: 1px solid #d1d5db;
            padding: 8px 12px;
            text-align: left;
          }
          th {
            background: #eff6ff;
            font-weight: 600;
            color: #1e40af;
          }
          a {
            color: #2563eb;
            text-decoration: none;
          }
          hr {
            border: none;
            border-top: 2px solid #e5e7eb;
            margin: 30px 0;
          }
        `
      }
    );
    
    if (pdf) {
      console.log('✅ PDF başarıyla oluşturuldu: ARCHITECTURE.pdf');
      const stats = fs.statSync('ARCHITECTURE.pdf');
      console.log(`📊 Dosya boyutu: ${(stats.size / 1024).toFixed(2)} KB`);
    }
  } catch (error) {
    console.error('❌ PDF oluşturulurken hata:', error.message);
    process.exit(1);
  }
}

generatePDF();
