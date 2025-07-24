#!/bin/bash

# Post-install script to handle Playwright browser installation
# This runs after npm install to ensure browsers are properly installed

set -e

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

print_status() {
    echo -e "${YELLOW}[SETUP]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Detect OS
OS="$(uname -s)"
case "${OS}" in
    Darwin*)    PLATFORM=mac;;
    Linux*)     PLATFORM=linux;;
    CYGWIN*)    PLATFORM=windows;;
    MINGW*)     PLATFORM=windows;;
    *)          PLATFORM=unknown;;
esac

print_status "Detected platform: $PLATFORM"

# Install Playwright browsers
install_browsers() {
    print_status "Installing Playwright browsers..."
    
    if command -v npx >/dev/null 2>&1; then
        # Try to install browsers with dependencies
        if npx playwright install --with-deps >/dev/null 2>&1; then
            print_success "Playwright browsers installed successfully!"
        else
            print_status "Falling back to basic browser installation..."
            npx playwright install
            print_success "Playwright browsers installed (without system deps)!"
        fi
    else
        print_error "npx not found. Please ensure Node.js is properly installed."
        exit 1
    fi
}

# Platform-specific post-install actions
case $PLATFORM in
    mac)
        print_status "Running Mac-specific setup..."
        
        # Check if Xcode tools are installed
        if ! xcode-select -p >/dev/null 2>&1; then
            print_error "Xcode command line tools not found!"
            print_status "Please run: xcode-select --install"
            print_status "Then run: npm run setup:mac"
            exit 1
        fi
        
        install_browsers
        
        print_success "Mac setup complete!"
        print_status "If you encounter browser issues, run: npm run setup:mac"
        ;;
        
    linux)
        print_status "Running Linux setup..."
        install_browsers
        print_success "Linux setup complete!"
        ;;
        
    windows)
        print_status "Running Windows setup..."
        install_browsers
        print_success "Windows setup complete!"
        ;;
        
    *)
        print_status "Running generic setup..."
        install_browsers
        print_success "Setup complete!"
        ;;
esac
