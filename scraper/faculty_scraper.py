from __future__ import annotations

"""
Faculty Scraper - Collects instructor data from METU department websites.

Each department has a faculty page with div.card-text elements containing
pipe-separated info: "Title Name | email | phone | room | university | website | research"
"""

import logging
import random
import re
import time
import unicodedata
from urllib.parse import urlparse

import psycopg2
import psycopg2.extras
import requests
from bs4 import BeautifulSoup

from config import DATABASE_URL, DEPARTMENT_CONFIG, HEADERS, REQUEST_DELAY

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Turkish slugify
# ---------------------------------------------------------------------------

_TR_CHAR_MAP = str.maketrans({
    "ç": "c", "Ç": "C",
    "ğ": "g", "Ğ": "G",
    "ı": "i", "I": "I",
    "İ": "I",
    "ö": "o", "Ö": "O",
    "ş": "s", "Ş": "S",
    "ü": "u", "Ü": "U",
})


def turkish_slugify(text: str) -> str:
    """Convert a Turkish text to a URL-friendly slug."""
    text = text.translate(_TR_CHAR_MAP)
    text = unicodedata.normalize("NFKD", text)
    text = text.encode("ascii", "ignore").decode("ascii")
    text = text.lower().strip()
    text = re.sub(r"[^\w\s-]", "", text)
    text = re.sub(r"[-\s]+", "-", text)
    return text.strip("-")


def make_slug(name: str, dept_code: str) -> str:
    """Generate a slug from instructor name and department code."""
    return f"{turkish_slugify(name)}-{dept_code.lower()}"


# ---------------------------------------------------------------------------
# Title parsing
# ---------------------------------------------------------------------------

def parse_title(raw_text: str) -> tuple[str, str]:
    """
    Parse the first field of a card-text to extract title and name.

    The raw text starts with title prefix(es) followed by the person's name.
    Examples:
        "Prof. Dr. John Smith" -> ("Prof. Dr.", "John Smith")
        "Prof. Dr. Assoc. Jane Doe" -> ("Doç. Dr.", "Jane Doe")
        "Prof. Dr. Asst. Bob Lee" -> ("Dr. Öğr. Üyesi", "Bob Lee")
        "Dr. Alice Brown" -> ("Dr.", "Alice Brown")

    Returns (title, name).
    """
    raw_text = raw_text.strip()

    # Check for Asst. (assistant professor) - must check before Assoc.
    if "Asst." in raw_text:
        title = "Dr. Öğr. Üyesi"
        # Remove all title prefixes to get the name
        name = raw_text
        for prefix in ["Prof.", "Dr.", "Asst.", "Assoc."]:
            name = name.replace(prefix, "")
        name = name.strip()
        return title, name

    # Check for Assoc. (associate professor)
    if "Assoc." in raw_text:
        title = "Doç. Dr."
        name = raw_text
        for prefix in ["Prof.", "Dr.", "Assoc."]:
            name = name.replace(prefix, "")
        name = name.strip()
        return title, name

    # Check for "Prof. Dr." (full professor)
    if "Prof." in raw_text and "Dr." in raw_text:
        title = "Prof. Dr."
        name = raw_text
        for prefix in ["Prof.", "Dr."]:
            name = name.replace(prefix, "")
        name = name.strip()
        return title, name

    # Check for "Dr." alone
    if "Dr." in raw_text:
        title = "Dr."
        name = raw_text.replace("Dr.", "").strip()
        return title, name

    # No recognized title
    return "", raw_text


# ---------------------------------------------------------------------------
# Database helpers
# ---------------------------------------------------------------------------

def parse_database_url(url: str) -> dict:
    """Parse a PostgreSQL connection URL into psycopg2 connect kwargs."""
    parsed = urlparse(url)
    params = {
        "host": parsed.hostname,
        "port": parsed.port or 5432,
        "user": parsed.username,
        "dbname": parsed.path.lstrip("/"),
    }
    if parsed.password:
        params["password"] = parsed.password
    return params


def get_connection():
    """Return a new psycopg2 connection."""
    params = parse_database_url(DATABASE_URL)
    conn = psycopg2.connect(**params)
    conn.autocommit = False
    return conn


def ensure_department(cur, code: str, name: str) -> int:
    """Upsert a department and return its id."""
    cur.execute(
        """
        INSERT INTO "Department" (code, name, university)
        VALUES (%s, %s, 'ODTU')
        ON CONFLICT (code) DO UPDATE SET name = EXCLUDED.name
        RETURNING id
        """,
        (code, name),
    )
    return cur.fetchone()[0]


def upsert_instructor(cur, data: dict) -> int:
    """Upsert an instructor row by slug and return its id."""
    cur.execute(
        """
        INSERT INTO "Instructor" (
            name, slug, title, email, "photoUrl", "avesisUrl", "departmentId",
            "createdAt", "updatedAt"
        ) VALUES (
            %(name)s, %(slug)s, %(title)s, %(email)s,
            %(photo_url)s, %(avesis_url)s, %(department_id)s,
            NOW(), NOW()
        )
        ON CONFLICT (slug) DO UPDATE SET
            name           = EXCLUDED.name,
            title          = EXCLUDED.title,
            email          = EXCLUDED.email,
            "photoUrl"     = EXCLUDED."photoUrl",
            "avesisUrl"    = EXCLUDED."avesisUrl",
            "departmentId" = EXCLUDED."departmentId",
            "updatedAt"    = NOW()
        RETURNING id
        """,
        data,
    )
    return cur.fetchone()[0]


# ---------------------------------------------------------------------------
# Rate limiting
# ---------------------------------------------------------------------------

def polite_sleep():
    """Sleep for a random duration defined in config."""
    delay = random.uniform(REQUEST_DELAY[0], REQUEST_DELAY[1])
    time.sleep(delay)


# ---------------------------------------------------------------------------
# Scraping logic
# ---------------------------------------------------------------------------

def fetch_page(url: str, session: requests.Session) -> BeautifulSoup | None:
    """Fetch a URL and return a BeautifulSoup object, or None on failure."""
    try:
        resp = session.get(url, headers=HEADERS, timeout=30)
        resp.raise_for_status()
        # Try to handle encoding issues - some METU pages use iso8859-9
        if resp.encoding and "iso" in resp.encoding.lower():
            resp.encoding = "iso-8859-9"
        return BeautifulSoup(resp.text, "html.parser")
    except requests.RequestException as exc:
        logger.error("Failed to fetch %s: %s", url, exc)
        return None


def parse_faculty_page(soup: BeautifulSoup, dept_code: str, faculty_url: str) -> list[dict]:
    """
    Parse a department faculty page and extract instructor data.

    Each instructor is represented by a div.card-text with pipe-separated fields:
    "Title Name | email | phone | room | university | website | research"

    Images are in img tags with src containing /sites/{dept}.metu.edu.tr/files/
    """
    cards = soup.select("div.card-text")
    # Also collect all images that look like faculty photos
    all_imgs = soup.select("img")

    # Build list of photo URLs from img tags
    photo_urls = []
    for img in all_imgs:
        src = img.get("src", "")
        if "/sites/" in src and ".metu.edu.tr/files/" in src:
            # Make absolute URL if relative
            if src.startswith("/"):
                # Extract base from faculty_url
                parsed = urlparse(faculty_url)
                src = f"{parsed.scheme}://{parsed.netloc}{src}"
            elif not src.startswith("http"):
                parsed = urlparse(faculty_url)
                src = f"{parsed.scheme}://{parsed.netloc}/{src}"
            photo_urls.append(src)

    instructors = []
    for i, card in enumerate(cards):
        text = card.get_text(separator="|").strip()
        if not text:
            continue

        parts = [p.strip() for p in text.split("|")]
        if not parts:
            continue

        # First part: "Title Name"
        raw_title_name = parts[0]
        title, name = parse_title(raw_title_name)

        if not name or len(name) < 2:
            logger.warning("  Skipping card with no parseable name: %s", raw_title_name[:80])
            continue

        # Email: second part, replace [at] with @
        email = ""
        if len(parts) > 1:
            email_raw = parts[1].strip()
            email = email_raw.replace("[at]", "@").replace(" ", "")
            # Validate it looks like an email
            if "@" not in email or "." not in email:
                email = ""

        # Photo: match by index if available
        photo_url = ""
        if i < len(photo_urls):
            photo_url = photo_urls[i]

        # Website / avesis URL: check parts for a URL
        avesis_url = ""
        for part in parts:
            part = part.strip()
            if "avesis.metu.edu.tr" in part:
                avesis_url = part if part.startswith("http") else f"https://{part}"
                break

        slug = make_slug(name, dept_code)

        instructors.append({
            "name": name,
            "slug": slug,
            "title": title,
            "email": email if email else None,
            "photo_url": photo_url if photo_url else None,
            "avesis_url": avesis_url if avesis_url else None,
            "department_id": None,  # filled in later
        })

    return instructors


def scrape_department(dept_code: str, dept_info: dict, session: requests.Session, conn) -> int:
    """
    Scrape all instructors for a single department from its faculty page.
    Returns the number of instructors processed.
    """
    faculty_url = dept_info["faculty_url"]
    logger.info("Scraping faculty for %s (%s) from %s", dept_code, dept_info["name"], faculty_url)

    soup = fetch_page(faculty_url, session)
    if soup is None:
        return 0

    cur = conn.cursor()
    dept_id = ensure_department(cur, dept_code, dept_info["name"])
    conn.commit()

    instructors = parse_faculty_page(soup, dept_code, faculty_url)
    logger.info("  Found %d faculty members on page for %s", len(instructors), dept_code)

    count = 0
    for instr in instructors:
        instr["department_id"] = dept_id

        try:
            upsert_instructor(cur, instr)
            conn.commit()
            count += 1
            logger.info("  [%d] Upserted: %s (%s) - %s", count, instr["name"], instr["slug"], instr["title"])
        except psycopg2.Error as exc:
            conn.rollback()
            logger.error("  DB error upserting %s: %s", instr["name"], exc)

    return count


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

def scrape_all() -> dict:
    """
    Scrape every department defined in DEPARTMENT_CONFIG.
    Returns a summary dict: {dept_code: instructor_count, ...}
    """
    summary: dict[str, int] = {}
    session = requests.Session()
    conn = get_connection()

    try:
        for dept_code, dept_info in DEPARTMENT_CONFIG.items():
            try:
                count = scrape_department(dept_code, dept_info, session, conn)
                summary[dept_code] = count
            except Exception as exc:
                logger.exception("Error scraping faculty for %s: %s", dept_code, exc)
                summary[dept_code] = 0

            polite_sleep()
    finally:
        conn.close()
        session.close()

    return summary


if __name__ == "__main__":
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    )
    result = scrape_all()
    for dept, cnt in result.items():
        print(f"{dept}: {cnt} instructors")
