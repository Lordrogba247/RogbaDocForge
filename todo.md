# RogbaDocForge Project TODO

## Backend
- [x] Install Tesseract OCR + Python deps
- [x] Create Python OCR script (ocr_extract.py)
- [x] Create Python Word generator (generate_docx.py)
- [x] Create Python PDF generator (generate_pdf.py)
- [x] Create Python PowerPoint generator (generate_pptx.py)
- [x] Create Python Excel generator (generate_xlsx.py)
- [x] Add conversions table to drizzle schema
- [x] Apply database migration
- [x] Create conversion tRPC router (convertText, ocrExtract, getHistory, deleteHistory)
- [x] Wire conversion router into appRouter

## Frontend
- [x] Update index.css with elegant design system
- [x] Update index.html with Google Fonts
- [x] Update App.tsx with navbar, dark/light mode, routes
- [x] Build Home page (format selector, image upload + OCR, text editor, convert/download)
- [x] Build History page (conversion history, download + delete)

## Polish & Verify
- [x] Verify dev server compiles with 0 errors
- [x] Test text-to-document conversion
- [x] Test OCR extraction
- [x] Test dark/light mode toggle
- [x] Save checkpoint

## TypeScript to JavaScript Conversion
- [x] Rename all .ts/.tsx files to .js/.jsx (client, server, shared, drizzle, root config)
- [x] Strip TypeScript syntax from all client files
- [x] Strip TypeScript syntax from all server files
- [x] Strip TypeScript syntax from shared files
- [x] Remove tsconfig.json, @types/* packages, typescript from package.json
- [x] Update vite.config and vitest.config for JS
- [x] Test build and dev server, fix errors
- [x] Save checkpoint
