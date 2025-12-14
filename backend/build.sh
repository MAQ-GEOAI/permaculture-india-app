#!/bin/bash
# Build script for Render.com
# Optimized for speed and reliability

set -e

echo "Upgrading pip, setuptools, and wheel..."
pip install --upgrade pip setuptools wheel

echo "Installing requirements..."
pip install -r requirements.txt

echo "Checking for GDAL (optional - will use Python fallback if not available)..."
gdal_contour --version 2>/dev/null && echo "✅ GDAL found" || echo "⚠️  GDAL not found - will use Python fallback"

echo "Build complete!"

