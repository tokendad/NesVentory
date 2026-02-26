#!/usr/bin/env python3
"""
Pre-train the CategoryAgent using Village Chronicler labeled catalog.

Run once after deployment:
    cd /data/NesVentory/backend
    VILLAGE_CHRONICLER_PATH=/data/thevillagechronicler.com python scripts/pretrain_category_agent.py

Reads: Village Chronicler HTML archive (set VILLAGE_CHRONICLER_PATH env var)
Writes: pretrained_agent.pkl.b64 — paste this into the agent_models table,
        or use the /api/agents/categorize/seed endpoint (if implemented).

IMPORTANT: Image filenames in ItemImages/ do NOT always match official D56 item numbers.
This script reads item_number from Collection HTML rows (not from image filenames).
There are 294 collection rows where image filename != official item number.
"""

import os, re, sys, json
from pathlib import Path

# Add parent directory to path so we can import from backend/app
sys.path.insert(0, str(Path(__file__).parent.parent))

try:
    from app.category_agent import CategoryAgent
except ImportError:
    print("ERROR: Could not import CategoryAgent. Make sure scikit-learn is installed:")
    print("  pip install scikit-learn")
    sys.exit(1)

VC_PATH = os.environ.get('VILLAGE_CHRONICLER_PATH', '/data/thevillagechronicler.com')

SERIES_PREFIX_MAP = {
    'DV': "Dickens' Village",
    'OSV': 'The Original Snow Village',
    'NEV': 'New England Village',
    'NP': 'North Pole Series',
    'CIC': 'Christmas in the City',
    'ALP': 'Alpine Village',
    'SVH': 'Snow Village Halloween',
    'FIG': 'Figurines',
    'GVA': 'General Village Accessories',
}


def build_catalog(base_path: str) -> list[dict]:
    """
    Parse Collection HTML files to build an authoritative labeled catalog.
    
    Each item block in the HTML has a two-row pattern:
    1. <tr nameit=image ...><img src=".../ItemImages/NNNN.jpg"></tr>  — image row
    2. <tr><td>&nbsp;OFFICIAL_NUMBER</td><td>Name</td><td>1987-1995</td></tr>  — data row
    
    The image filename is NOT always the same as the official item number.
    We extract both and use item_number as the authoritative D56 identifier.
    """
    collections_dir = Path(base_path) / 'Collections'
    if not collections_dir.exists():
        print(f"ERROR: Collections directory not found at {collections_dir}")
        sys.exit(1)

    seen_items = set()
    catalog = []

    for fname in sorted(os.listdir(collections_dir)):
        if not fname.endswith('.html'):
            continue
        prefix = fname.split()[0].upper()
        series = next((v for k, v in SERIES_PREFIX_MAP.items() if prefix.startswith(k)), None)
        if not series:
            continue

        filepath = collections_dir / fname
        with open(filepath, errors='replace') as f:
            lines = f.read().split('\n')

        i = 0
        while i < len(lines):
            line = lines[i]
            # Find image row (has nameit=image attribute and ItemImages reference)
            if 'nameit=image' in line and 'ItemImages' in line:
                # Look ahead for the data row with official item number + name + years
                for j in range(i + 1, min(i + 5, len(lines))):
                    data_match = re.search(
                        r'&nbsp;\s*([\w\-]+)\s*</strong></td>'
                        r'.*?<strong>(.*?)</strong></td>'
                        r'.*?<strong>([\d\-]+)</strong>',
                        lines[j]
                    )
                    if data_match:
                        item_number = data_match.group(1).strip()
                        name = data_match.group(2).strip()
                        years = data_match.group(3).strip()
                        if item_number not in seen_items and name:
                            seen_items.add(item_number)
                            catalog.append({
                                'item_number': item_number,
                                'name': name,
                                'years': years,
                                'series': series,
                            })
                        break
            i += 1

    return catalog


def main():
    print(f"Loading Village Chronicler data from: {VC_PATH}")
    if not os.path.exists(VC_PATH):
        print(f"ERROR: Path not found: {VC_PATH}")
        print("Set VILLAGE_CHRONICLER_PATH env var to the archive location.")
        sys.exit(1)

    catalog = build_catalog(VC_PATH)
    print(f"Parsed {len(catalog)} unique labeled items")

    # Show series distribution
    counts = {}
    for item in catalog:
        counts[item['series']] = counts.get(item['series'], 0) + 1
    print("\nSeries distribution:")
    for series, count in sorted(counts.items(), key=lambda x: -x[1]):
        print(f"  {series}: {count}")

    print(f"\nTraining CategoryAgent on {len(catalog)} items...")
    agent = CategoryAgent()
    for item in catalog:
        # Use name as training text, series as label
        agent._X.append(item['name'])
        agent._y.append(item['series'])
    agent.training_samples = len(agent._X)
    agent._retrain()

    if agent.pipeline is None:
        print("ERROR: Training failed — need at least 2 classes and 5+ samples.")
        sys.exit(1)

    print(f"Training complete: {agent.training_samples} samples, version {agent.version}")

    # Test predictions
    test_items = [
        ("Scrooge & Marley Counting House", "Dickens' Village"),
        ("Josef Engel Farmhouse", "Alpine Village"),
        ("Snow Village Mill Creek", "The Original Snow Village"),
        ("Pumpkin Plaza", "Snow Village Halloween"),
        ("Santa's Lookout Tower", "North Pole Series"),
    ]
    print("\nTest predictions:")
    for name, expected in test_items:
        result = agent.predict(name)
        predicted = result.get('series', 'NO PREDICTION')
        confidence = result.get('confidence', 0)
        status = "✓" if predicted == expected else "✗"
        print(f"  {status} '{name}' → {predicted} ({confidence:.0%}) [expected: {expected}]")

    # Serialize
    output_file = Path(__file__).parent / 'pretrained_agent.pkl.b64'
    serialized = agent.serialize()
    with open(output_file, 'w') as f:
        f.write(serialized)
    print(f"\nSaved to: {output_file}")
    print(f"File size: {len(serialized):,} bytes (base64)")
    print("\nTo seed into the database:")
    print("  Use POST /api/agents/categorize/seed with the file content")
    print("  Or insert directly into agent_models table with id='category_agent_v1'")

    # Also save a JSON summary for reference
    summary = {
        'training_samples': agent.training_samples,
        'model_version': agent.version,
        'series_distribution': counts,
        'model_file': str(output_file),
    }
    summary_file = output_file.with_suffix('.json')
    with open(summary_file, 'w') as f:
        json.dump(summary, f, indent=2)
    print(f"Summary saved to: {summary_file}")


if __name__ == '__main__':
    main()
