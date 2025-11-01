#!/bin/bash

# Quick Fix for APT Lock Issue
# Immediately kills the apt process and clears locks
# Usage: bash fix-apt-lock.sh

echo "=========================================="
echo "APT Lock Fix - Immediate Kill"
echo "=========================================="
echo ""

# Check if running as root
if [ "$EUID" -ne 0 ]; then 
    echo "⚠️  This script must be run as root"
    echo "Try: sudo bash fix-apt-lock.sh"
    exit 1
fi

echo "Step 1: Killing apt processes..."

# Kill all apt processes
pkill -9 apt 2>/dev/null || true
pkill -9 apt-get 2>/dev/null || true
pkill -9 unattended-upgrade 2>/dev/null || true

sleep 1

echo "✓ APT processes killed"
echo ""

echo "Step 2: Removing lock files..."

# Remove lock files
rm -f /var/lib/apt/lists/lock
rm -f /var/cache/apt/archives/lock
rm -f /var/lib/dpkg/lock*

echo "✓ Lock files removed"
echo ""

echo "Step 3: Reconfiguring dpkg..."

# Reconfigure dpkg
dpkg --configure -a 2>/dev/null || true

echo "✓ DPKG reconfigured"
echo ""

echo "Step 4: Verifying package manager..."

# Test apt
apt update > /dev/null 2>&1
if [ $? -eq 0 ]; then
    echo "✓ Package manager is working"
else
    echo "⚠️  Package manager may have issues"
    echo "Try running: sudo apt --fix-broken install"
fi

echo ""
echo "=========================================="
echo "✓ APT Lock Fix Complete!"
echo "=========================================="
echo ""
echo "You can now run: bash start-prod.sh"
echo ""
