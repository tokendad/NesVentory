# InvenTree

InvenTree is a self-hosted home inventory system focused on:

- Multi-user access and authentication
- Nested locations (house → room → shelf, etc.)
- Rich item details (purchase info, warranties, documents)
- Maintenance scheduling
- Extensible hooks for barcode scanning and insurance exports
- Docker-first, Linux-friendly deployment

> **Status:** Starter scaffold – core backend API and Docker setup.  
> Frontend UI, barcode integrations, and insurance PDF exports are intentionally left for future iterations.

---

## Tech stack

- **Language:** Python 3.12
- **Web framework:** FastAPI
- **Database:** PostgreSQL (via SQLAlchemy)
- **Auth:** JWT-based login with hashed passwords
- **Deployment:** Docker + docker-compose

---

## Project layout

```text
inventree/
├─ README.md
├─ LICENSE
├─ docker-compose.yml
├─ .gitignore
└─ backend/
   ├─ Dockerfile
   ├─ requirements.txt
   └─ app/
      ├─ __init__.py
      ├─ config.py
      ├─ database.py
      ├─ models.py
      ├─ schemas.py
      ├─ auth.py
      ├─ crud.py
      └─ main.py
```

---

## Quickstart (Docker)

1. Make sure you have **Docker** and **docker-compose** installed.
2. Clone your GitHub repo and drop these files into it (or unzip this starter in the repo root).
3. From the project root, run:

```bash
docker-compose up --build
```

4. Once the containers are up, the API should be available at:

- `http://localhost:8000`
- Interactive docs (Swagger): `http://localhost:8000/docs`

---

## Environment configuration

Default values are provided, but you can override them with environment variables.

Key variables (see `config.py` for full list):

- `INV_DB_HOST` (default: `db`)
- `INV_DB_PORT` (default: `5432`)
- `INV_DB_USER` (default: `inventree`)
- `INV_DB_PASS` (default: `inventree`)
- `INV_DB_NAME` (default: `inventree`)
- `INV_SECRET_KEY` (default: **development-only** value)
- `INV_DEBUG` (default: `true`)

---

## Core domain concepts

### Users

- Email & password-based login (JWT tokens)
- Intended for future multi-user & role support
- SSO/identity providers (e.g., Google) can be plugged in later

### Locations (nested)

- `Location` model with a self-referential `parent_id`
- Examples:
  - `Maine House` → `Living Room` → `Media Shelf`
  - `79 Potter` → `Garage` → `Tool Cabinet` → `Top Shelf`

### Items

Each item includes fields such as:

- Manufacturer / brand
- Model number
- Serial number
- Purchase date
- Purchase price & estimated value
- Retailer
- Warranty duration and extended warranty info
- Optional document link (manuals, receipts, etc.)

### Maintenance

- `MaintenanceTask` entity linked to an item
- Includes next due date, optional recurrence hint (e.g., `yearly`)
- Designed to evolve into reminders / SMS / push notifications later

### Barcode / Insurance / Cloud storage (future)

This starter includes placeholders where we can later:

- Hook barcode lookups to an open UPC/GTIN database
- Generate inventory / insurance PDFs for export
- Store the database or backups in cloud locations (e.g., S3, GCS, Google Drive, Dropbox)

---

## Development (without Docker)

If you prefer running locally:

```bash
cd backend
python -m venv .venv
source .venv/bin/activate  # On Windows: .venv\Scripts\activate
pip install -r requirements.txt

export INV_DB_URL="postgresql+psycopg2://inventree:inventree@localhost:5432/inventree"
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

Make sure a PostgreSQL instance is running and matches `INV_DB_URL`.

---

## License

This project is under the MIT License. See `LICENSE` for details.

---

## Credits

- Initial concept and scaffolding: **TokenDad** and **ChatGPT (OpenAI)**.
- Future contributions are welcome via pull requests on GitHub.
