#!/usr/bin/env python3
"""
Bump version script for NesVentory.
Updates the VERSION file based on the label type (bug, enhancement).
"""
import sys
import os

def main():
    if len(sys.argv) < 2:
        print("Usage: bump_version.py <label_type>")
        print("  label_type: 'bug' for patch bump, 'enhancement' for minor bump")
        sys.exit(1)

    label_type = sys.argv[1]
    version_file = "VERSION"

    # Read current version
    if not os.path.exists(version_file):
        print(f"Error: {version_file} not found")
        sys.exit(1)

    with open(version_file, 'r') as f:
        version = f.read().strip()

    # Parse version (expected format: MAJOR.MINOR.PATCH or MAJOR.MINOR.PATCH-suffix)
    # Split on first hyphen to separate version from suffix
    if '-' in version:
        version_part, suffix = version.split('-', 1)
        suffix = '-' + suffix
    else:
        version_part = version
        suffix = ''

    parts = version_part.split('.')
    if len(parts) < 3:
        print(f"Error: Version must be MAJOR.MINOR.PATCH format, got: {version}")
        sys.exit(1)

    major = int(parts[0])
    minor = int(parts[1])
    patch = int(parts[2])

    # Bump version based on label type
    if label_type == 'bug':
        patch += 1
    elif label_type == 'enhancement':
        minor += 1
        patch = 0
    else:
        print(f"Unknown label type: {label_type}")
        sys.exit(1)

    new_version = f"{major}.{minor}.{patch}{suffix}"

    # Write new version
    with open(version_file, 'w') as f:
        f.write(new_version + '\n')

    print(f"Bumped version: {version} -> {new_version}")

if __name__ == '__main__':
    main()
