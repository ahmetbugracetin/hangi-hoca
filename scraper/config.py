import os
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://bc@localhost:5432/hangi_hoca")

# SIS program codes mapped to our department short codes
# Format: "SIS_ID": {"code": "SHORT_CODE", "name": "Turkish Department Name"}
DEPARTMENT_CONFIG = {
    "571": {"code": "CENG", "name": "Bilgisayar Mühendisliği"},
    "567": {"code": "EE", "name": "Elektrik-Elektronik Müh."},
    "569": {"code": "ME", "name": "Makine Mühendisliği"},
    "562": {"code": "CE", "name": "İnşaat Mühendisliği"},
    "563": {"code": "CHE", "name": "Kimya Mühendisliği"},
    "568": {"code": "IE", "name": "Endüstri Mühendisliği"},
    "560": {"code": "ENVE", "name": "Çevre Mühendisliği"},
    "570": {"code": "METE", "name": "Metalurji ve Malzeme Müh."},
    "564": {"code": "GEOE", "name": "Jeoloji Mühendisliği"},
    "565": {"code": "MINE", "name": "Maden Mühendisliği"},
    "566": {"code": "PETE", "name": "Petrol ve Doğalgaz Müh."},
    "572": {"code": "AEE", "name": "Havacılık ve Uzay Müh."},
    "573": {"code": "FDE", "name": "Gıda Mühendisliği"},
    "236": {"code": "MATH", "name": "Matematik"},
    "230": {"code": "PHYS", "name": "Fizik"},
    "234": {"code": "CHEM", "name": "Kimya"},
    "238": {"code": "BIOL", "name": "Biyoloji"},
    "246": {"code": "STAT", "name": "İstatistik"},
    "120": {"code": "ARCH", "name": "Mimarlık"},
    "121": {"code": "CRP", "name": "Şehir ve Bölge Planlama"},
    "125": {"code": "ID", "name": "Endüstri Ürünleri Tasarımı"},
    "312": {"code": "BA", "name": "İşletme"},
    "311": {"code": "ECON", "name": "İktisat"},
    "310": {"code": "ADM", "name": "Siyaset Bilimi ve Kamu Yönetimi"},
    "314": {"code": "IR", "name": "Uluslararası İlişkiler"},
    "232": {"code": "SOC", "name": "Sosyoloji"},
    "233": {"code": "PSY", "name": "Psikoloji"},
    "240": {"code": "HIST", "name": "Tarih"},
    "241": {"code": "PHIL", "name": "Felsefe"},
    "219": {"code": "GENE", "name": "Moleküler Biyoloji ve Genetik"},
    "450": {"code": "FLE", "name": "Yabancı Diller Eğitimi"},
    "430": {"code": "CEIT", "name": "Bilgisayar ve Öğretim Tek. Eğitimi"},
    "410": {"code": "ELE", "name": "İlköğretim"},
    "454": {"code": "EDS", "name": "Eğitim Bilimleri"},
}

# SIS programs that are not on the Ankara campus and are skipped:
# 350-399 are METU Northern Cyprus Campus (KKK/NCC) programs, 575 is the
# Türkiye-Azerbaijan University (TAU) joint program. Their names duplicate the
# Ankara departments (e.g. 355-CNG vs 571-CENG "Computer Engineering").
EXCLUDED_PROGRAM_IDS = {str(i) for i in range(350, 400)} | {"575"}

# Course names that SIS lists under a coordinator rather than a teaching
# instructor (theses, summer practice, special/advanced studies, seminars...).
# These are not stored, so they never appear on instructor pages.
COORDINATION_COURSE_RE = (
    r"thesis|dissertation|special stud|advanced? stud|summer practice"
    r"|term project|seminar|^special topics?$"
)

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
}

REQUEST_DELAY = (1, 3)  # Random delay between requests in seconds

# SIS configuration
SIS_BASE = "https://sis.metu.edu.tr"
SIS_SEMESTER_PAGE = "get.php?package=8ezIBOEFHx1cRnE7mvLSPqj-6BhZfFCMQjdO9PZwAcSB6XvUeCd2I2bd8pEQ-1_LEit62-4bNWQ1aLfQWIPcOA"
CURRENT_SEMESTER = "20251"  # 2025-2026 Fall
SEMESTER_LABEL = "2025 Güz"

# Title mapping: SIS English titles → Turkish
TITLE_MAP = {
    "Prof.Dr.": "Prof. Dr.",
    "Assoc.Prof.Dr.": "Doç. Dr.",
    "Assist.Prof.Dr": "Dr. Öğr. Üyesi",
    "Assist.Prof.Dr.": "Dr. Öğr. Üyesi",
    "Instructor Dr.": "Öğr. Gör. Dr.",
    "Instructor": "Öğr. Gör.",
    "Res.Assist.Dr.": "Arş. Gör. Dr.",
    "Res.Assist.": "Arş. Gör.",
    "Lecturer Dr.": "Öğr. Gör. Dr.",
    "Lecturer": "Öğr. Gör.",
}
