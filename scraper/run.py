#!/usr/bin/env python3
from __future__ import annotations

"""
Master runner for Hangi Hoca scrapers.

Usage:
    python run.py              # Run the SIS scraper (courses + instructors + sections)
"""

import logging
import sys
import time
from datetime import datetime

from sis_scraper import scrape_all

logger = logging.getLogger("run")


def setup_logging():
    """Configure logging for the entire scraper pipeline."""
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
        datefmt="%Y-%m-%d %H:%M:%S",
        handlers=[
            logging.StreamHandler(sys.stdout),
        ],
    )


def format_duration(seconds: float) -> str:
    """Format seconds into a human-readable duration string."""
    if seconds < 60:
        return f"{seconds:.1f}s"
    minutes = int(seconds // 60)
    secs = seconds % 60
    if minutes < 60:
        return f"{minutes}m {secs:.0f}s"
    hours = minutes // 60
    mins = minutes % 60
    return f"{hours}h {mins}m {secs:.0f}s"


def main():
    """Main entry point."""
    setup_logging()

    start_time = datetime.now()
    logger.info("Hangi Hoca SIS scraper started at %s", start_time.strftime("%Y-%m-%d %H:%M:%S"))

    exit_code = 0

    try:
        logger.info("=" * 60)
        logger.info("Fetching data from sis.metu.edu.tr ...")
        logger.info("=" * 60)

        start = time.time()
        summary = scrape_all()
        elapsed = time.time() - start

        total_inst = sum(s["instructors"] for s in summary.values())
        total_courses = sum(s["courses"] for s in summary.values())
        total_sections = sum(s["sections"] for s in summary.values())
        depts_with_data = sum(1 for s in summary.values() if s["courses"] > 0)

        logger.info("-" * 60)
        logger.info("SIS scraper finished in %s", format_duration(elapsed))
        logger.info("  Departments with data: %d / %d", depts_with_data, len(summary))
        logger.info("  Total instructors: %d", total_inst)
        logger.info("  Total courses: %d", total_courses)
        logger.info("  Total sections: %d", total_sections)
        for dept, stats in summary.items():
            logger.info(
                "    %s: %d instructors, %d courses, %d sections",
                dept, stats["instructors"], stats["courses"], stats["sections"],
            )
        logger.info("-" * 60)

    except KeyboardInterrupt:
        logger.warning("Interrupted by user.")
        exit_code = 130
    except Exception as exc:
        logger.exception("Scraper failed: %s", exc)
        exit_code = 1

    end_time = datetime.now()
    total_elapsed = (end_time - start_time).total_seconds()

    logger.info("=" * 60)
    logger.info("SCRAPER RUN COMPLETE")
    logger.info("  Started:  %s", start_time.strftime("%Y-%m-%d %H:%M:%S"))
    logger.info("  Finished: %s", end_time.strftime("%Y-%m-%d %H:%M:%S"))
    logger.info("  Duration: %s", format_duration(total_elapsed))
    logger.info("=" * 60)

    sys.exit(exit_code)


if __name__ == "__main__":
    main()
