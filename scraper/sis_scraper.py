#!/usr/bin/env python3
"""
SIS Scraper — Fetches courses, sections, and instructors from sis.metu.edu.tr

SIS returns a single table per department with all course sections for a given
semester, including instructor name/title, schedule, and classroom info.
"""
from __future__ import annotations

import logging
import random
import re
import time
import unicodedata
from typing import Any

import psycopg2
import psycopg2.extras
import requests
from bs4 import BeautifulSoup

from config import (
    DATABASE_URL,
    DEPARTMENT_CONFIG,
    HEADERS,
    REQUEST_DELAY,
    SIS_BASE,
    SIS_SEMESTER_PAGE,
    CURRENT_SEMESTER,
    TITLE_MAP,
)

logger = logging.getLogger("sis_scraper")

PROGRAM_OPTION_RE = re.compile(r"^(?P<sis_id>\d+)-(?P<code>[A-Z0-9]+)-(?P<name>.+)$")
PLACEHOLDER_INSTRUCTOR_NAMES = {
    "STAFF",
    "TBA",
    "N/A",
    "-",
}

# Column indices in the SIS table (0-based)
COL_COURSE_CODE = 4
COL_COURSE_NAME = 5
COL_CREDIT = 6
COL_ECTS = 7
COL_SECTION = 11
COL_CAPACITY = 12
COL_INSTRUCTOR_NAME = 45
COL_INSTRUCTOR_TITLE = 46


def make_slug(name: str, dept_code: str) -> str:
    """Convert an instructor name to a URL-friendly slug."""
    # Normalize Turkish characters
    replacements = {
        "ı": "i", "İ": "i", "ğ": "g", "Ğ": "g",
        "ü": "u", "Ü": "u", "ş": "s", "Ş": "s",
        "ö": "o", "Ö": "o", "ç": "c", "Ç": "c",
    }
    s = name.lower().strip()
    for tr_char, en_char in replacements.items():
        s = s.replace(tr_char, en_char)
    # Remove accents from remaining characters
    s = unicodedata.normalize("NFKD", s).encode("ascii", "ignore").decode("ascii")
    # Replace non-alphanum with hyphens
    s = re.sub(r"[^a-z0-9]+", "-", s).strip("-")
    dept_suffix = re.sub(r"[^a-z0-9]+", "-", dept_code.lower()).strip("-")
    return f"{s}-{dept_suffix}" if dept_suffix else s


def normalize_name(raw: str) -> str:
    """Normalize instructor name to Title Case with proper Turkish handling."""
    raw = raw.strip()
    if not raw:
        return raw
    # SIS names are ALL CAPS — first normalize Turkish special chars,
    # then title-case, then restore Turkish letters
    # Turkish uppercase İ → lowercase i (not ı), Ş→ş, Ö→ö, Ü→ü, Ç→ç, Ğ→ğ
    def title_part(word: str) -> str:
        """Title-case a single word with Turkish-aware logic."""
        w = word.lower()
        # Turkish lowercase: İ→i, I→ı in Turkish, but SIS uses English locale
        # Replace known Turkish uppercase combos
        w = w.replace("İ".lower(), "i")  # Handle İ → i̇ → i
        # Normalize any leftover combining characters
        w = unicodedata.normalize("NFC", w)
        # Fix: i̇ (i + combining dot above) → i
        w = w.replace("i\u0307", "i")
        if not w:
            return w
        return w[0].upper() + w[1:]

    parts = raw.split()
    return " ".join(title_part(p) for p in parts)


def map_title(sis_title: str) -> str:
    """Map SIS English title to Turkish equivalent."""
    t = sis_title.strip().rstrip(".")
    # Try exact match first, then with trailing dot
    return TITLE_MAP.get(sis_title.strip(), TITLE_MAP.get(t + ".", sis_title.strip()))


def normalize_response_encoding(response: requests.Response) -> None:
    """Fix SIS responses that default to ISO-8859-1 despite UTF-8 content."""
    apparent = response.apparent_encoding
    if not response.encoding or response.encoding.lower() == "iso-8859-1":
        if apparent:
            response.encoding = apparent


def parse_program_option(sis_id: str, raw_text: str) -> dict[str, str]:
    """Parse a SIS program option into normalized program metadata."""
    text = raw_text.strip()
    match = PROGRAM_OPTION_RE.match(text)

    overrides = DEPARTMENT_CONFIG.get(sis_id, {})
    code = overrides.get("code", "")
    name = overrides.get("name", "")

    if match:
        code = code or match.group("code").strip()
        name = name or match.group("name").strip()

    if not code:
        code = sis_id
    if not name:
        name = text or sis_id

    return {
        "sis_id": sis_id,
        "code": code,
        "name": name,
    }


def discover_programs(semester_page_html: str) -> dict[str, dict[str, str]]:
    """Read all available SIS programs from the semester search page."""
    soup = BeautifulSoup(semester_page_html, "html.parser")
    program_select = soup.find("select", {"name": "selectProgram"})
    if not program_select:
        raise RuntimeError("Could not find SIS program selector")

    programs: dict[str, dict[str, str]] = {}
    for option in program_select.find_all("option"):
        sis_id = option.get("value", "").strip()
        if not sis_id:
            continue
        programs[sis_id] = parse_program_option(
            sis_id, option.get_text(" ", strip=True)
        )

    if not programs:
        raise RuntimeError("Could not discover any SIS programs")

    return programs


def extract_html_payload(response: requests.Response) -> str:
    """Extract SIS HTML from either the JSON AJAX payload or raw HTML fallback."""
    normalize_response_encoding(response)
    body = response.text.lstrip()

    if body.startswith("{"):
        try:
            payload = response.json()
        except ValueError:
            logger.warning("Failed to decode SIS JSON payload, falling back to raw HTML")
            return response.text

        if payload.get("error"):
            raise RuntimeError("SIS returned an error payload")

        return payload.get("data", "") or ""

    return response.text


def is_placeholder_instructor(name: str) -> bool:
    """Return True for non-person placeholders that should not create instructors."""
    cleaned = " ".join(name.upper().split())
    return cleaned in PLACEHOLDER_INSTRUCTOR_NAMES


def convert_course_code(numeric_code: str, dept_code: str, sis_id: str) -> str:
    """Convert SIS numeric course code (e.g. 5710140) to readable (e.g. CENG140)."""
    digits = re.sub(r"\D+", "", numeric_code)
    if digits.startswith(sis_id):
        course_num = digits[len(sis_id):].lstrip("0") or "0"
        return f"{dept_code}{course_num}"
    if len(digits) > 4:
        return f"{dept_code}{digits[-3:]}"
    return numeric_code.strip()


def get_sis_session() -> tuple[requests.Session, str, dict[str, dict[str, str]]]:
    """Create a SIS session and return (session, stamp, discovered_programs)."""
    session = requests.Session()
    session.headers.update(HEADERS)

    url = f"{SIS_BASE}/{SIS_SEMESTER_PAGE}"
    r = session.get(url, timeout=30)
    r.raise_for_status()
    normalize_response_encoding(r)

    soup = BeautifulSoup(r.text, "html.parser")
    stamp_input = soup.find("input", {"name": "stamp"})
    stamp = stamp_input.get("value", "") if stamp_input else ""

    if not stamp:
        raise RuntimeError("Could not get SIS session stamp")

    programs = discover_programs(r.text)

    logger.info(
        "SIS session established, stamp=%s..., discovered %d programs",
        stamp[:20],
        len(programs),
    )
    return session, stamp, programs


def fetch_department_data(
    session: requests.Session, stamp: str, sis_id: str
) -> list[dict[str, Any]]:
    """Fetch all course rows for a department from SIS."""
    session.headers.update({"X-Requested-With": "XMLHttpRequest"})

    data = {
        "selectSemester": CURRENT_SEMESTER,
        "selectProgram": sis_id,
        "submitSearchForm": "1",
        "stamp": stamp,
    }

    r = session.post(f"{SIS_BASE}/main.php", data=data, timeout=60)
    r.raise_for_status()

    try:
        html = extract_html_payload(r)
    except RuntimeError:
        logger.warning("SIS returned error for program %s", sis_id)
        return []

    if not html:
        return []

    soup = BeautifulSoup(html, "html.parser")
    rows = soup.find_all("tr")

    if len(rows) <= 1:  # header only or empty
        return []

    results = []
    for row in rows[1:]:  # skip header
        cells = row.find_all("td")
        if len(cells) < 47:
            continue

        instructor_name = cells[COL_INSTRUCTOR_NAME].text.strip()
        instructor_title = cells[COL_INSTRUCTOR_TITLE].text.strip()

        if not instructor_name or is_placeholder_instructor(instructor_name):
            continue

        results.append({
            "course_code": cells[COL_COURSE_CODE].text.strip(),
            "course_name": cells[COL_COURSE_NAME].text.strip(),
            "credit": cells[COL_CREDIT].text.strip(),
            "ects": cells[COL_ECTS].text.strip(),
            "section": cells[COL_SECTION].text.strip(),
            "capacity": cells[COL_CAPACITY].text.strip(),
            "instructor_name": instructor_name,
            "instructor_title": instructor_title,
        })

    return results


def upsert_data(
    conn, sis_id: str, dept_code: str, dept_name: str, rows: list[dict]
) -> dict:
    """Upsert department, instructors, courses, and sections into the database."""
    cur = conn.cursor()

    # Upsert department
    cur.execute(
        """
        INSERT INTO "Department" (name, code, university)
        VALUES (%s, %s, 'ODTU')
        ON CONFLICT (code) DO UPDATE SET name = EXCLUDED.name
        RETURNING id
        """,
        (dept_name, dept_code),
    )
    dept_id = cur.fetchone()[0]

    # Collect unique instructors and courses
    instructors_seen: dict[str, dict] = {}
    courses_seen: dict[str, dict] = {}
    sections: list[dict] = []

    for row in rows:
        # Instructor
        raw_name = row["instructor_name"]
        name = normalize_name(raw_name)
        slug = make_slug(raw_name, dept_code)

        if slug and slug not in instructors_seen:
            instructors_seen[slug] = {
                "name": name,
                "title": map_title(row["instructor_title"]),
                "slug": slug,
            }

        # Course
        readable_code = convert_course_code(row["course_code"], dept_code, sis_id)
        if readable_code not in courses_seen:
            credit_val = None
            try:
                credit_val = int(row["credit"])
            except (ValueError, TypeError):
                pass
            courses_seen[readable_code] = {
                "code": readable_code,
                "name": row["course_name"].title(),
                "credits": credit_val,
            }

        # Section
        sections.append({
            "course_code": readable_code,
            "instructor_slug": slug,
            "section_num": row["section"],
        })

    # Upsert instructors
    instructor_id_map: dict[str, int] = {}
    for slug, info in instructors_seen.items():
        cur.execute(
            """
            INSERT INTO "Instructor" (name, title, slug, "departmentId", "createdAt", "updatedAt")
            VALUES (%s, %s, %s, %s, NOW(), NOW())
            ON CONFLICT (slug) DO UPDATE SET
                name = EXCLUDED.name,
                title = EXCLUDED.title,
                "departmentId" = EXCLUDED."departmentId",
                "updatedAt" = NOW()
            RETURNING id
            """,
            (info["name"], info["title"], slug, dept_id),
        )
        instructor_id_map[slug] = cur.fetchone()[0]

    # Upsert courses
    course_id_map: dict[str, int] = {}
    for code, info in courses_seen.items():
        cur.execute(
            """
            INSERT INTO "Course" (code, name, credits, "departmentId")
            VALUES (%s, %s, %s, %s)
            ON CONFLICT (code) DO UPDATE SET
                name = EXCLUDED.name,
                credits = EXCLUDED.credits,
                "departmentId" = EXCLUDED."departmentId"
            RETURNING id
            """,
            (info["code"], info["name"], info["credits"], dept_id),
        )
        course_id_map[code] = cur.fetchone()[0]

    # Upsert sections
    sections_count = 0
    for sec in sections:
        course_id = course_id_map.get(sec["course_code"])
        instructor_id = instructor_id_map.get(sec["instructor_slug"])
        if not course_id or not instructor_id:
            continue

        cur.execute(
            """
            INSERT INTO "CourseSection" ("courseId", "instructorId", semester)
            VALUES (%s, %s, %s)
            ON CONFLICT DO NOTHING
            """,
            (course_id, instructor_id, CURRENT_SEMESTER),
        )
        sections_count += cur.rowcount

    conn.commit()
    cur.close()

    return {
        "instructors": len(instructors_seen),
        "courses": len(courses_seen),
        "sections": sections_count,
    }


def scrape_all() -> dict[str, dict]:
    """Scrape all departments from SIS and return summary."""
    conn = psycopg2.connect(DATABASE_URL)
    summary: dict[str, dict] = {}

    try:
        session, stamp, programs = get_sis_session()

        for sis_id, dept_info in programs.items():
            dept_code = dept_info["code"]
            dept_name = dept_info["name"]
            logger.info("Fetching %s (%s) from SIS...", dept_code, dept_name)

            try:
                rows = fetch_department_data(session, stamp, sis_id)
                logger.info("  Got %d rows from SIS", len(rows))

                if rows:
                    stats = upsert_data(conn, sis_id, dept_code, dept_name, rows)
                    summary[dept_code] = stats
                    logger.info(
                        "  Upserted: %d instructors, %d courses, %d sections",
                        stats["instructors"],
                        stats["courses"],
                        stats["sections"],
                    )
                else:
                    summary[dept_code] = {"instructors": 0, "courses": 0, "sections": 0}

            except Exception as exc:
                logger.exception("  Error scraping %s: %s", dept_code, exc)
                summary[dept_code] = {"instructors": 0, "courses": 0, "sections": 0}

            # Be polite
            delay = random.uniform(*REQUEST_DELAY)
            time.sleep(delay)

    finally:
        conn.close()

    return summary


if __name__ == "__main__":
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    )
    result = scrape_all()
    for dept, stats in result.items():
        print(f"{dept}: {stats}")
