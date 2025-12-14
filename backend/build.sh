#!/bin/bash
# Build script for Render.com
# This ensures setuptools and GDAL are installed before other packages

set -e

echo "Installing system dependencies (GDAL)..."
# Install GDAL system packages (required for gdal_contour)
sudo apt-get update -qq
sudo apt-get install -y -qq gdal-bin libgdal-dev python3-gdal

echo "Upgrading pip, setuptools, and wheel..."
pip install --upgrade pip setuptools wheel

echo "Installing requirements..."
pip install -r requirements.txt

echo "Verifying GDAL installation..."
gdal_contour --version || echo "Warning: gdal_contour not found, but continuing..."

echo "Build complete!"

