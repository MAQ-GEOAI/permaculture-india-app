#!/bin/bash
# Build script for Render.com
# This ensures setuptools is installed before other packages

set -e

echo "Upgrading pip, setuptools, and wheel..."
pip install --upgrade pip setuptools wheel

echo "Installing requirements..."
pip install -r requirements.txt

echo "Build complete!"

