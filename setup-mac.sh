#!/bin/bash

# GPT Crawler Setup Script for Mac
# This script automates the installation process and resolves common Mac-specific issues

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Function to check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Function to get macOS version
get_macos_version() {
    sw_vers -productVersion
}

# Function to check if Xcode command line tools are installed
check_xcode_tools() {
    if xcode-select -p >/dev/null 2>&1; then
        return 0
    else
        return 1
    fi
}

# Function to install Xcode command line tools
install_xcode_tools() {
    print_status "Installing Xcode command line tools..."
    xcode-select --install
    
    print_warning "Please complete the Xcode command line tools installation in the popup window."
    print_warning "Press any key to continue after installation is complete..."
    read -n 1 -s
}

# Function to check Node.js version
check_node_version() {
    if command_exists node; then
        local version=$(node --version | cut -d'v' -f2)
        local major_version=$(echo $version | cut -d'.' -f1)
        
        if [ "$major_version" -ge 16 ]; then
            return 0
        else
            return 1
        fi
    else
        return 1
    fi
}

# Function to install Node.js via nvm
install_node_nvm() {
    print_status "Installing nvm (Node Version Manager)..."
    
    # Install nvm
    curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
    
    # Source nvm
    export NVM_DIR="$HOME/.nvm"
    [ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
    [ -s "$NVM_DIR/bash_completion" ] && \. "$NVM_DIR/bash_completion"
    
    # Install latest LTS Node
    nvm install --lts
    nvm use --lts
    nvm alias default node
}

# Function to suggest Node.js installation methods
suggest_node_installation() {
    print_warning "Node.js 16+ is required but not found."
    echo
    echo "Choose an installation method:"
    echo "1) Install via nvm (recommended for developers)"
    echo "2) Install via Homebrew"
    echo "3) Download from nodejs.org"
    echo "4) Skip (I'll install manually)"
    echo
    read -p "Enter your choice (1-4): " choice
    
    case $choice in
        1)
            install_node_nvm
            ;;
        2)
            print_status "Installing Node.js via Homebrew..."
            if command_exists brew; then
                brew install node
            else
                print_error "Homebrew not found. Please install Homebrew first or choose another option."
                exit 1
            fi
            ;;
        3)
            print_status "Please download and install Node.js from https://nodejs.org/"
            print_warning "Press any key to continue after installation..."
            read -n 1 -s
            ;;
        4)
            print_warning "Skipping Node.js installation. Please install Node.js 16+ manually."
            ;;
        *)
            print_error "Invalid choice. Exiting."
            exit 1
            ;;
    esac
}

# Function to install npm dependencies
install_npm_dependencies() {
    print_status "Installing npm dependencies..."
    
    # Clean install
    if [ -f "package-lock.json" ]; then
        rm package-lock.json
    fi
    
    if [ -d "node_modules" ]; then
        rm -rf node_modules
    fi
    
    npm install
}

# Function to install Playwright browsers
install_playwright_browsers() {
    print_status "Installing Playwright browsers and dependencies..."
    
    # Remove existing browsers to ensure clean install
    if [ -d "$HOME/Library/Caches/ms-playwright" ]; then
        print_status "Removing existing Playwright browsers..."
        rm -rf "$HOME/Library/Caches/ms-playwright"
    fi
    
    # Install browsers with system dependencies
    npx playwright install --with-deps
    
    # Verify installation
    print_status "Verifying Playwright installation..."
    npx playwright install-deps
}

# Function to test browser launch
test_browser_launch() {
    print_status "Testing browser launch..."
    
    # Create a simple test script
    cat > test-browser.js << 'EOF'
const { chromium } = require('playwright');

(async () => {
  try {
    console.log('Launching browser...');
    const browser = await chromium.launch({ headless: true });
    console.log('Browser launched successfully!');
    
    const page = await browser.newPage();
    await page.goto('https://example.com');
    console.log('Page loaded successfully!');
    
    await browser.close();
    console.log('Browser closed successfully!');
    console.log('✅ Browser test passed!');
  } catch (error) {
    console.error('❌ Browser test failed:', error.message);
    process.exit(1);
  }
})();
EOF
    
    # Run the test
    if node test-browser.js; then
        print_success "Browser test passed!"
        rm test-browser.js
        return 0
    else
        print_error "Browser test failed!"
        rm test-browser.js
        return 1
    fi
}

# Function to create Mac-optimized config
create_mac_config() {
    print_status "Creating Mac-optimized configuration..."
    
    if [ ! -f "config.ts.backup" ]; then
        cp config.ts config.ts.backup
    fi
    
    cat > config-mac.ts << 'EOF'
import { Config } from "./src/config.js";

// Mac-optimized configuration for GPT Crawler
export const defaultConfig: Config = {
  url: "https://example.com",
  match: "https://example.com/**",
  selector: "main",
  maxPagesToCrawl: 10, // Start small for testing
  outputFileName: "output.json",
  
  // Mac-friendly settings
  maxConcurrency: 2,    // Lower concurrency for stability
  delay: 1000,          // 1 second delay between requests
  timeout: 60000,       // 60 second timeout
  
  // Optional: Browser configuration
  onVisitPage: ({ page }) => {
    // Set Mac-like user agent
    page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
  }
};
EOF
    
    print_success "Created Mac-optimized config: config-mac.ts"
    print_status "You can copy this to config.ts or use it as a reference."
}

# Function to run system diagnostics
run_diagnostics() {
    print_status "Running system diagnostics..."
    echo
    echo "=== System Information ==="
    echo "macOS Version: $(get_macos_version)"
    echo "Architecture: $(uname -m)"
    echo "Available Memory: $(vm_stat | grep 'Pages free' | awk '{print $3}' | sed 's/\.//' | awk '{print $1 * 4096 / 1024 / 1024}' | cut -d'.' -f1) MB"
    echo "Available Disk Space: $(df -h . | tail -1 | awk '{print $4}')"
    echo
    echo "=== Software Versions ==="
    echo "Node.js: $(node --version 2>/dev/null || echo 'Not installed')"
    echo "npm: $(npm --version 2>/dev/null || echo 'Not installed')"
    echo "Playwright: $(npx playwright --version 2>/dev/null || echo 'Not installed')"
    echo
    echo "=== Xcode Tools ==="
    if check_xcode_tools; then
        echo "Xcode Command Line Tools: ✅ Installed"
        echo "Xcode Path: $(xcode-select -p)"
    else
        echo "Xcode Command Line Tools: ❌ Not installed"
    fi
    echo
}

# Function to show post-installation help
show_post_installation_help() {
    echo
    print_success "=== Setup Complete! ==="
    echo
    echo "Next steps:"
    echo "1. Edit config.ts with your target URL and selectors"
    echo "2. Run 'npm start' to begin crawling"
    echo
    echo "Mac-specific tips:"
    echo "• Use lower maxConcurrency (1-2) on older Macs"
    echo "• Increase delay between requests if you get rate limited"
    echo "• Monitor Activity Monitor during crawling"
    echo
    echo "If you encounter issues:"
    echo "• Check MAC_SETUP_GUIDE.md for detailed troubleshooting"
    echo "• Run 'npm run test-browser' to verify Playwright works"
    echo "• Use 'DEBUG=pw:* npm start' for verbose logging"
    echo
    echo "Happy crawling! 🚀"
}

# Main installation flow
main() {
    clear
    echo
    echo "================================================"
    echo "     GPT Crawler Setup Script for Mac"
    echo "================================================"
    echo
    
    # Check macOS version
    local macos_version=$(get_macos_version)
    print_status "Detected macOS $macos_version"
    
    # Warn about older macOS versions
    local major_version=$(echo $macos_version | cut -d'.' -f1)
    if [ "$major_version" -lt 11 ]; then
        print_warning "macOS $macos_version detected. Consider upgrading to macOS 11+ for best compatibility."
    fi
    
    # Check and install Xcode tools
    if ! check_xcode_tools; then
        print_warning "Xcode command line tools not found."
        install_xcode_tools
    else
        print_success "Xcode command line tools are installed."
    fi
    
    # Check and install Node.js
    if ! check_node_version; then
        suggest_node_installation
    else
        print_success "Node.js $(node --version) is installed."
    fi
    
    # Verify Node.js after installation
    if ! check_node_version; then
        print_error "Node.js 16+ is still not available. Please install it manually and run this script again."
        exit 1
    fi
    
    # Install npm dependencies
    install_npm_dependencies
    
    # Install Playwright browsers
    install_playwright_browsers
    
    # Test browser launch
    if ! test_browser_launch; then
        print_error "Browser test failed. Please check MAC_SETUP_GUIDE.md for troubleshooting."
        exit 1
    fi
    
    # Create Mac-optimized config
    create_mac_config
    
    # Run diagnostics
    run_diagnostics
    
    # Show help
    show_post_installation_help
}

# Handle script arguments
case "${1:-}" in
    --diagnostics)
        run_diagnostics
        exit 0
        ;;
    --test-browser)
        test_browser_launch
        exit $?
        ;;
    --help)
        echo "GPT Crawler Mac Setup Script"
        echo
        echo "Usage: $0 [OPTIONS]"
        echo
        echo "Options:"
        echo "  --diagnostics    Run system diagnostics only"
        echo "  --test-browser   Test browser launch only"
        echo "  --help          Show this help message"
        echo
        echo "Run without arguments to perform full setup."
        exit 0
        ;;
    "")
        main
        ;;
    *)
        print_error "Unknown option: $1"
        echo "Use --help for usage information."
        exit 1
        ;;
esac
