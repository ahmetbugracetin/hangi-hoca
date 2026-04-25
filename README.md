# Hangi Hoca

A full-stack web platform for ODTÜ students to rate and review their instructors and courses.

## Features

- Browse instructors by department and course
- Read and write reviews with star ratings
- Search across instructors and courses
- User authentication (register, login, JWT-based sessions)
- Automated scraping of ODTÜ SIS for up-to-date instructor and course data

## Architecture

```
hangi-hoca/
├── backend/    # REST API — Node.js, Express, TypeScript, Prisma, PostgreSQL
├── frontend/   # Web app — Next.js 14, TypeScript, Tailwind CSS, Framer Motion
└── scraper/    # Data pipeline — Python scripts to scrape ODTÜ SIS
```

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 14, TypeScript, Tailwind CSS, Framer Motion |
| Backend | Node.js, Express, TypeScript |
| Database | PostgreSQL + Prisma ORM |
| Auth | JWT + bcrypt |
| Scraper | Python (requests, BeautifulSoup) |
| Security | Helmet, xss-clean, rate limiting, Zod validation |

## Setup

### Backend

```bash
cd backend
npm install
cp .env.example .env   # fill in your values
npx prisma migrate dev
npx prisma db seed
npm run dev
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

### Scraper

```bash
cd scraper
pip install -r requirements.txt
python run.py
```

## API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/auth/register` | Register a new user |
| POST | `/api/auth/login` | Login |
| GET | `/api/instructors` | List all instructors |
| GET | `/api/instructors/:slug` | Get instructor details |
| GET | `/api/courses` | List all courses |
| GET | `/api/reviews` | List reviews |
| POST | `/api/reviews` | Submit a review |
| GET | `/api/departments` | List departments |
| GET | `/api/stats` | Platform statistics |
