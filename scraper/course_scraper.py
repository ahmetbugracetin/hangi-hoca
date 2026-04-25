from __future__ import annotations

"""
Course Scraper - Collects course data from METU's OIBS system.
https://oibs2.metu.edu.tr/View_Program_Course_Details_64/main.php

Steps per department:
1. GET the page to establish a session (cookies)
2. POST with select_dept, select_semester, textWithoutThesis, hidden_redir, submit_CourseList
3. Parse table index 3 (the large course listing table)
4. Extract course code, name, credits from each row
"""

import logging
import random
import re
import time
from urllib.parse import urlparse

import psycopg2
import psycopg2.extras
import requests
from bs4 import BeautifulSoup

from config import (
    DATABASE_URL,
    DEPARTMENT_CONFIG,
    HEADERS,
    OIBS_BASE,
    CURRENT_SEMESTER,
    REQUEST_DELAY,
)

logger = logging.getLogger(__name__)


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


def upsert_course(cur, data: dict) -> int:
    """Upsert a course row and return its id."""
    cur.execute(
        """
        INSERT INTO "Course" (
            code, name, credits, "departmentId"
        ) VALUES (
            %(code)s, %(name)s, %(credits)s, %(department_id)s
        )
        ON CONFLICT (code) DO UPDATE SET
            name           = EXCLUDED.name,
            credits        = EXCLUDED.credits,
            "departmentId" = EXCLUDED."departmentId"
        RETURNING id
        """,
        data,
    )
    return cur.fetchone()[0]


def upsert_course_section(cur, data: dict) -> int:
    """
    Upsert a course_section row and return its id.
    Uses (courseId, instructorId, semester) as the dedup key.
    """
    # Check if this exact combination already exists
    cur.execute(
        """
        SELECT id FROM "CourseSection"
        WHERE "courseId" = %(course_id)s
          AND "instructorId" = %(instructor_id)s
          AND semester = %(semester)s
        """,
        data,
    )
    row = cur.fetchone()
    if row:
        return row[0]

    cur.execute(
        """
        INSERT INTO "CourseSection" (
            "courseId", "instructorId", semester
        ) VALUES (
            %(course_id)s, %(instructor_id)s, %(semester)s
        )
        RETURNING id
        """,
        data,
    )
    return cur.fetchone()[0]


def find_instructor_by_name(cur, name: str, department_id: int):
    """
    Try to find an instructor by name within a department.
    Returns the instructor id or None.
    """
    # Exact match first
    cur.execute(
        'SELECT id FROM "Instructor" WHERE name = %s AND "departmentId" = %s',
        (name, department_id),
    )
    row = cur.fetchone()
    if row:
        return row[0]

    # Fuzzy: try ILIKE with trimmed name
    cur.execute(
        'SELECT id FROM "Instructor" WHERE name ILIKE %s AND "departmentId" = %s LIMIT 1',
        (f"%{name.strip()}%", department_id),
    )
    row = cur.fetchone()
    if row:
        return row[0]

    # Cross-department fallback
    cur.execute(
        'SELECT id FROM "Instructor" WHERE name ILIKE %s LIMIT 1',
        (f"%{name.strip()}%",),
    )
    row = cur.fetchone()
    return row[0] if row else None


# ---------------------------------------------------------------------------
# Rate limiting
# ---------------------------------------------------------------------------

def polite_sleep():
    """Sleep for a random duration defined in config."""
    delay = random.uniform(REQUEST_DELAY[0], REQUEST_DELAY[1])
    time.sleep(delay)


# ---------------------------------------------------------------------------
# Course code conversion
# ---------------------------------------------------------------------------

def convert_course_code(oibs_code: str, dept_code: str, oibs_id: str) -> str:
    """
    Convert OIBS numeric course code to human-readable form.
    Example: "5710140" with dept CENG (oibs_id=571) -> "CENG140"

    The OIBS code starts with the department's oibs_id digits,
    followed by the course number (possibly with leading zeros).
    """
    oibs_code = oibs_code.strip()
    if oibs_code.startswith(oibs_id):
        number_part = oibs_code[len(oibs_id):]
        # Remove leading zeros but keep at least the number
        number_part = number_part.lstrip("0") or "0"
        return f"{dept_code}{number_part}"
    # Fallback: just prepend dept code
    return f"{dept_code}{oibs_code}"


# ---------------------------------------------------------------------------
# Scraping logic
# ---------------------------------------------------------------------------

def scrape_department_courses(
    dept_code: str,
    dept_info: dict,
    session: requests.Session,
    conn,
) -> dict:
    """
    Scrape courses for one department from OIBS.
    Returns {"courses": int, "sections": int}.
    """
    oibs_id = dept_info["oibs_id"]
    logger.info(
        "Scraping OIBS courses for %s (%s), oibs_id=%s, semester=%s",
        dept_code, dept_info["name"], oibs_id, CURRENT_SEMESTER,
    )

    cur = conn.cursor()
    dept_id = ensure_department(cur, dept_code, dept_info["name"])
    conn.commit()

    # Step 1: GET the page to establish session cookies
    try:
        resp = session.get(OIBS_BASE, headers=HEADERS, timeout=30)
        resp.raise_for_status()
    except requests.RequestException as exc:
        logger.error("  Failed to GET OIBS page: %s", exc)
        return {"courses": 0, "sections": 0}

    # Step 2: POST to get the course list
    post_data = {
        "select_dept": oibs_id,
        "select_semester": CURRENT_SEMESTER,
        "textWithoutThesis": "1",
        "hidden_redir": "Login",
        "submit_CourseList": "Submit",
    }

    try:
        resp = session.post(OIBS_BASE, data=post_data, headers=HEADERS, timeout=30)
        resp.raise_for_status()
    except requests.RequestException as exc:
        logger.error("  Failed to POST to OIBS: %s", exc)
        return {"courses": 0, "sections": 0}

    # Handle encoding
    if resp.encoding and "iso" in resp.encoding.lower():
        resp.encoding = "iso-8859-9"

    soup = BeautifulSoup(resp.text, "html.parser")

    # Step 3: Find table index 3 (the big course listing table)
    tables = soup.find_all("table")
    if len(tables) < 4:
        logger.warning(
            "  Expected at least 4 tables on OIBS page for %s, found %d",
            dept_code, len(tables),
        )
        # Try to find the largest table as fallback
        if tables:
            target_table = max(tables, key=lambda t: len(t.find_all("tr")))
        else:
            logger.error("  No tables found on OIBS page for %s", dept_code)
            return {"courses": 0, "sections": 0}
    else:
        target_table = tables[3]

    rows = target_table.find_all("tr")
    logger.info("  Found %d rows in course table for %s", len(rows), dept_code)

    course_count = 0
    section_count = 0

    for row in rows:
        cells = row.find_all("td")
        if len(cells) < 5:
            continue

        # Check for radio button in first cell - its value is the course code
        radio = row.find("input", {"type": "radio"})
        if not radio:
            continue

        oibs_code = radio.get("value", "").strip()
        if not oibs_code:
            continue

        # Cell indices (after radio button cell):
        # cell 0: radio button
        # cell 1: course code (numeric like "5710140")
        # cell 2: course name
        # cell 3: ECTS
        # cell 4: credit (like "3.00 (3,0,0)")
        # cell 5: level
        # cell 6: type

        cell_texts = [c.get_text(strip=True) for c in cells]

        # Course code from cell 1
        raw_code = cell_texts[1] if len(cell_texts) > 1 else oibs_code
        course_code = convert_course_code(raw_code, dept_code, oibs_id)

        # Course name from cell 2
        course_name = cell_texts[2] if len(cell_texts) > 2 else ""

        # Credits from cell 4: parse "X.00 (Y,Z,W)" -> take X as int
        credits = 0
        if len(cell_texts) > 4:
            credits_text = cell_texts[4]
            credits_match = re.match(r"(\d+)", credits_text)
            if credits_match:
                credits = int(credits_match.group(1))

        if not course_name:
            logger.warning("  Skipping row with empty course name: %s", course_code)
            continue

        try:
            course_id = upsert_course(cur, {
                "code": course_code,
                "name": course_name,
                "credits": credits if credits > 0 else None,
                "department_id": dept_id,
            })
            conn.commit()
            course_count += 1
            logger.info("  [%d] Course: %s - %s (credits: %s)", course_count, course_code, course_name, credits)
        except psycopg2.Error as exc:
            conn.rollback()
            logger.error("  DB error upserting course %s: %s", course_code, exc)

    return {"courses": course_count, "sections": section_count}


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

def scrape_all() -> dict:
    """
    Scrape courses for every department in DEPARTMENT_CONFIG from OIBS.
    Returns a summary dict:
        {dept_code: {"courses": int, "sections": int}, ...}
    """
    summary: dict[str, dict] = {}
    session = requests.Session()
    conn = get_connection()

    try:
        for dept_code, dept_info in DEPARTMENT_CONFIG.items():
            try:
                polite_sleep()
                stats = scrape_department_courses(dept_code, dept_info, session, conn)
                summary[dept_code] = stats
            except Exception as exc:
                logger.exception("Error scraping OIBS for %s: %s", dept_code, exc)
                summary[dept_code] = {"courses": 0, "sections": 0}
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
    for dept, stats in result.items():
        print(f"{dept}: {stats['courses']} courses, {stats['sections']} sections")
