import sys
import json
import os

label_type = sys.argv[1]
pkg_file = "package.json"

with open(pkg_file) as f:
    data = json.load(f)

version = data["version"]
parts = version.split(".")
if len(parts) < 3:
    raise ValueError("package.json version must be MAJOR.MINOR.PATCH-style")

major, minor_patch = parts[0], parts[1:]
minor = int(minor_patch[0])
patch_alpha = minor_patch[1].split("-")
patch = int(patch_alpha[0])

# Support alpha/beta suffix by preserving it
suffix = "-" + patch_alpha[1] if len(patch_alpha) > 1 else ""

if label_type == "bug":
    patch += 1
elif label_type == "enhancement":
    minor += 1
    patch = 0

new_version = f"{major}.{minor}.{patch}{suffix}"
data["version"] = new_version

with open(pkg_file, "w") as f:
    json.dump(data, f, indent=2)
    f.write("\n")

print(f"Bumped version: {version} -> {new_version}")