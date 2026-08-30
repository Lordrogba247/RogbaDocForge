# RogbaDocForge — Node app with Python-based document conversion (Word, PDF,
# PowerPoint, Excel, OCR). Render's default Node environment doesn't include
# Python, Tesseract OCR, or the system libraries WeasyPrint needs to render
# PDFs — so we use a Dockerfile to install everything explicitly.

FROM node:22-slim

# System dependencies:
# - python3 / pip: to run the conversion scripts in server/python_scripts
# - tesseract-ocr: the actual OCR engine pytesseract talks to
# - libpango / libcairo / etc: required by WeasyPrint to render PDFs
RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 \
    python3-pip \
    tesseract-ocr \
    libpango-1.0-0 \
    libpangocairo-1.0-0 \
    libpangoft2-1.0-0 \
    libgdk-pixbuf2.0-0 \
    libffi-dev \
    libcairo2 \
    shared-mime-info \
    fonts-liberation \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install Python dependencies first (better Docker layer caching)
COPY requirements.txt ./
RUN pip3 install --no-cache-dir --break-system-packages -r requirements.txt

# Install Node dependencies (including devDependencies — vite is needed at
# build time even though NODE_ENV=production is set later)
COPY package.json package-lock.json ./
RUN npm install --legacy-peer-deps --production=false

# Copy the rest of the project and build
COPY . .
RUN npm run build

ENV NODE_ENV=production

EXPOSE 3000

CMD ["npm", "run", "start"]