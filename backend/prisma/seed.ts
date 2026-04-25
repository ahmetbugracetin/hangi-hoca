import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

function slugify(name: string, deptCode: string): string {
  return (
    name
      .toLowerCase()
      .replace(/ö/g, "o").replace(/ü/g, "u").replace(/ç/g, "c")
      .replace(/ş/g, "s").replace(/ğ/g, "g").replace(/ı/g, "i")
      .replace(/İ/g, "i").replace(/Ö/g, "o").replace(/Ü/g, "u")
      .replace(/Ç/g, "c").replace(/Ş/g, "s").replace(/Ğ/g, "g")
      .replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") +
    "-" + deptCode.toLowerCase()
  );
}

function pick<T>(arr: T[]): T { return arr[Math.floor(Math.random() * arr.length)]; }
function randInt(min: number, max: number): number { return Math.floor(Math.random() * (max - min + 1)) + min; }

const SEMESTERS = ["2023 Güz", "2024 Bahar", "2024 Güz", "2025 Bahar", "2025 Güz"];
const CURRENT_SEM = "2025 Güz";

// ── CENG hoca-specific reviews based on real student sentiment ────────────

const CENG_INSTRUCTOR_REVIEWS: Record<string, string[]> = {
  "Halit Oğuztüzün": [
    "Yazılım mühendisliği dersini çok iyi anlatıyor, design pattern'ları gerçek projelerle açıklıyor.",
    "Bölüm başkanı olarak çok meşgul ama derslere gelince işini iyi yapıyor, CENG350'yi ondan almaya çalışın.",
    "UML diyagramlarını çok detaylı işliyor, sınavlarda da bunları soruyor. Hazırlıklı gidin.",
    "Hoca sakin ve sabırlı, sorulara düzgün cevap veriyor. Notlandırma da adil.",
    "Projeleri gerçekçi ve öğretici, takım çalışması yapmayı öğretiyor.",
  ],
  "Ahmet Coşar": [
    "Veritabanı dersini çok detaylı işliyor, normalizasyonu bu kadar iyi anlatan başka hoca görmedim.",
    "SQL sorgularını adım adım çözdürüyor, lab saatleri gerçekten faydalı.",
    "Hoca biraz yavaş ilerliyor ama temeli sağlam atıyor, acele etmemesi aslında iyi bir şey.",
    "Sınavlarda uzun SQL sorguları soruyor, süre biraz kısa kalabiliyor dikkat edin.",
    "ER diyagramlarını çok iyi öğretiyor, iş hayatında da işime çok yaradı.",
  ],
  "Onur Tolga Şehitoğlu": [
    "C dersini ondan alın kesinlikle, pointer'ları bile eğlenceli anlatıyor adam.",
    "Canlı kodlama yapması çok iyi, hataları bile öğretici şekilde düzeltiyor.",
    "Esprileri güzel, 3 saatlik ders geçiyor ama fark etmiyorsun valla.",
    "CENG242'yi de çok iyi anlatıyor, fonksiyonel programlamayı sevdiriyor.",
    "Hoca hem bilgili hem mütevazi, soru sormaktan çekinmeyin rahat birisi.",
    "Operating Systems dersini de veriyor, process management konusunu çok net açıklıyor.",
  ],
  "Cevat Şener": [
    "İşletim sistemleri dersini en iyi anlatan hocalardan, system call'ları çok iyi açıklıyor.",
    "C'de sistem programlama öğretme tarzı çok iyi, lab ödevleri gerçekten öğretici.",
    "Ödevleri zor ama bitirince gerçekten bir şeyler öğrendiğinizi hissediyorsunuz.",
    "Yoklama konusunda biraz sıkı, devamsızlık hakkınız sınırlı ama derste öğreniyorsunuz en azından.",
    "Hoca sakin anlatıyor ama konuya çok hakim, sorulara net cevap veriyor.",
  ],
  "Erol Şahin": [
    "Robotik ve bilgisayarlı görme derslerinde harika, projeleri gerçek dünyaya uygulanabilir şeyler.",
    "CENG334'ü ondan aldım, lab imkanları çok iyi. Dersi yoğun ama karşılığını alıyorsunuz.",
    "Hoca araştırmacı kimliğiyle de çok başarılı, KOVAN lab'da yapılan işler etkileyici.",
    "Sınavları zor olabiliyor ama hakkaniyetli, çalışana hakkını veriyor.",
  ],
  "Sinan Kalkan": [
    "Deep learning dersini çok iyi anlatıyor, kodlama ödevleri öğretici.",
    "Hocanın anlatım tarzı net ve anlaşılır, karmaşık konuları basitleştirmede çok iyi.",
    "Gençlerle iyi anlaşıyor, approachable bir hoca. Soru sormaktan çekinmeyin.",
    "Computer vision konusunda Türkiye'nin en iyilerinden, derslerini kaçırmayın.",
    "Ödevleri PyTorch ile veriyor, endüstriye hazırlıyor.",
  ],
  "İsmail Hakkı Toroslu": [
    "Algoritma derslerinde çok iyi, konuya hakimiyeti tartışmasız.",
    "Sınavları standart, çalışırsan geçersin tarzında. Adil notlandırma yapıyor.",
    "Anlatımı bazen biraz monoton olabiliyor ama ders içeriği sağlam.",
    "CENG242'yi de veriyor, Prolog kısmını detaylı işliyor.",
  ],
  "Nihan Kesim Çiçekli": [
    "NLP ve doğal dil işleme derslerinde gerçekten çok iyi, araştırma konularını derse güzel entegre ediyor.",
    "Hocanın alana bakışı çok geniş, farklı perspektiflerden yaklaşmayı öğretiyor.",
    "Ödevleri bazen belirsiz olabiliyor, ne istediğini tam anlamak için ofis saatine gitmek lazım.",
    "Genel olarak iyi bir hoca, saygılı ve anlayışlı.",
  ],
  "Ferda Nur Alpaslan": [
    "Yapay zeka dersini çok iyi anlatıyor, search algoritmalarını güzel açıklıyor.",
    "Sınavları bazen sürpriz olabiliyor, derste anlatılmayan detaylar çıkabiliyor.",
    "Konulara hâkim ama bazen hızlı geçebiliyor, not almak zor olabiliyor.",
    "Genel olarak faydalı bir ders, temel AI kavramlarını öğreniyorsunuz.",
  ],
  "Pınar Karagöz": [
    "Veritabanı ve veri madenciliği derslerinde çok iyi, uygulamalı anlatıyor.",
    "CENG222'de istatistik konularını anlaşılır şekilde işliyor.",
    "Hocanın projeleri öğretici ve gerçekçi, güzel geri bildirim veriyor.",
    "Sınavları makul, çalışınca iyi not almak mümkün.",
  ],
  "Ertan Onur": [
    "Ağ dersini çok iyi anlatıyor, protokolleri detaylı işliyor.",
    "CENG232'de logic design konularını iyi öğretiyor ama hızlı ilerliyor.",
    "Hoca enerjik, derse gelirken hazırlıklı geliyor.",
    "Lab ödevleri öğretici ama zaman alıyor, erken başlayın.",
  ],
  "Murat Manguoğlu": [
    "CENG232'yi iyi anlatıyor, mantık tasarımı konularını sağlam öğretiyor.",
    "Sınavları zorlayıcı ama adil, pratik yaparsanız sorun olmaz.",
    "Hoca sakin ve sabırlı, sorulara düzgün cevap veriyor.",
  ],
  "İsmail Sengör Altıngövde": [
    "CENG140'ı iyi anlatıyor, C programlamayı temelinden öğretiyor.",
    "Bilgi erişim konusunda çok bilgili, seçmeli derslerini de tavsiye ederim.",
    "Sınavları standart seviyede, çalışınca geçersiniz.",
  ],
  "Emre Akbaş": [
    "Sinyaller ve sistemler dersini bilgisayarcılara uygun anlatıyor, çok teorik kalmıyor.",
    "Computer vision tarafında da çok iyi araştırmaları var.",
    "Hocanın anlatımı düzgün ve organize, slaytları kaliteli.",
  ],
  "Ahmet Oğuz Akyüz": [
    "Bilgisayar grafikleri dersini çok iyi anlatıyor, OpenGL projelerini eğlenceli hale getiriyor.",
    "Embedded systems derslerinde de pratik bilgiler veriyor.",
    "Hoca yardımsever, ofis saatlerinde ulaşılabilir.",
  ],
  "Uluç Saranlı": [
    "Gömülü sistemler dersini çok detaylı işliyor, donanım-yazılım arayüzünü iyi öğretiyor.",
    "Robotik konusunda da çok bilgili, araştırma grubuna katılmak isteyenler için iyi bir mentor.",
    "Sınavları zorlayıcı ama öğretici, lab'lar faydalı.",
  ],
  "Faruk Polat": [
    "Yapay zeka ve çok ajanlı sistemler konusunda çok bilgili.",
    "Ders anlatımı biraz teorik kalabiliyor ama içerik sağlam.",
    "Sınavları makul, projeleri ilgi çekici.",
  ],
  "Pelin Angın Ülküer": [
    "Yazılım mühendisliği ve güvenlik derslerini iyi anlatıyor.",
    "Genç ve dinamik bir hoca, öğrencilerle iletişimi iyi.",
    "Projelerde güncel teknolojiler kullandırıyor.",
  ],
  "Hakan Yıldız": [
    "Formal languages dersini iyi anlatıyor, automata theory konularını anlaşılır kılıyor.",
    "Genç hoca, öğrencilere yakın ve ulaşılabilir.",
    "Ödevleri dengeli, ne çok kolay ne çok zor.",
  ],
  "Çağrı Toraman": [
    "Data structures dersini enerjik anlatıyor, kodlama ödevleri öğretici.",
    "NLP konusunda da araştırmaları var, ilgili seçmeli derslerini alın.",
    "Genç ve motive bir hoca, derslere hazırlıklı geliyor.",
  ],
  "Ramazan Gökberk Cinbiş": [
    "Computer vision ve makine öğrenmesi derslerinde çok iyi.",
    "Bitirme projelerini iyi yönetiyor, öğrencilere rehberlik ediyor.",
    "Araştırma odaklı ama öğretim kalitesi de yüksek.",
  ],
  "Şeyda Ertekin": [
    "İstatistik ve makine öğrenmesi derslerini uygulama odaklı anlatıyor.",
    "Sınavları adil, ödevleri Python ile veriyor.",
    "Bitirme projelerinde öğrencilere destek oluyor.",
  ],
};

// ── CENG explicit course-instructor map (based on real schedule) ─────────

const CENG_COURSE_MAP: Record<string, string[]> = {
  "CENG111": ["Çağrı Toraman", "Hakan Yıldız"],
  "CENG140": ["İsmail Sengör Altıngövde", "Onur Tolga Şehitoğlu"],
  "CENG213": ["Çağrı Toraman"],
  "CENG222": ["Şeyda Ertekin", "Pınar Karagöz"],
  "CENG223": ["İsmail Hakkı Toroslu", "Faruk Polat"],
  "CENG232": ["Murat Manguoğlu", "Ertan Onur"],
  "CENG242": ["Onur Tolga Şehitoğlu", "İsmail Hakkı Toroslu", "Hüseyin Aydın"],
  "CENG280": ["Hakan Yıldız"],
  "CENG315": ["İsmail Hakkı Toroslu", "Faruk Polat"],
  "CENG331": ["Ertan Onur", "Uluç Saranlı"],
  "CENG334": ["Erol Şahin", "Onur Tolga Şehitoğlu", "Cevat Şener"],
  "CENG336": ["Ahmet Oğuz Akyüz", "Uluç Saranlı"],
  "CENG350": ["Halit Oğuztüzün", "Pelin Angın Ülküer"],
  "CENG351": ["Ahmet Coşar", "Pınar Karagöz"],
  "CENG384": ["Emre Akbaş"],
  "CENG477": ["Ahmet Oğuz Akyüz", "Yusuf Sahillioğlu"],
  "CENG492": ["Ramazan Gökberk Cinbiş", "Şeyda Ertekin"],
};

// ── Generic review pools ─────────────────────────────────────────────────

const GENERIC_POSITIVE = [
  "Hoca dersine hâkim, anlattığı konuları net açıklıyor. Sınavları da derste işlenenlere uygun.",
  "Ofis saatlerinde müsait, sorulara sabırla cevap veriyor. Kesinlikle tavsiye ederim.",
  "Ders materyalleri güncel ve kapsamlı, slaytlar tek başına bile yeterli oluyor.",
  "Projelerde özgürlük tanıyor, istediğiniz teknolojiyi kullanabiliyorsunuz.",
  "Notlandırma adil, rubric paylaşılıyor önceden, neyin ne kadar puanlanacağı belli.",
  "Konuları gerçek hayat örnekleriyle anlatması dersi daha anlaşılır kılıyor.",
  "Lab'lar çok iyi organize, asistanlar da yardımcı. Pratik öğrenme için ideal.",
  "Hoca öğrenciyle iletişimi kuvvetli, ders dışında da yardımcı oluyor.",
  "Dersi aldığıma memnunum, mezun olunca işime yarayacak bilgiler edindim.",
  "Sınav soruları hakkaniyetli, çalışana hakkını veriyor.",
];

const GENERIC_NEGATIVE = [
  "Ders anlatımı monoton, slaytları okuyor sadece. Derse gitmesem de aynı şey aslında.",
  "Sınavları çok zor ve derste işlenenlerle orantısız, neyi çalışsam bilmiyorum.",
  "Notlandırma belirsiz, aynı seviye cevaplar farklı notlar alabiliyor.",
  "Ödevler aşırı yoğun, sanki tek bu dersi alıyormuşum gibi.",
  "Soru sorulunca bazen ters yapıyor, derste rahat hissetmiyorsun.",
  "Ders materyallerini paylaşmıyor, tahtaya yazıyor ve hızlı siliyor.",
  "Mail'lere cevap vermiyor, ofis saatinde de bulamıyorsun.",
  "Ders içeriği çok eski, güncel teknolojilerle alakası yok.",
  "Devamsızlık konusunda çok katı ama dersin kalitesi buna değmiyor.",
  "Grup projelerinde adaletsiz gruplar oluşturuyor.",
];

const GENERIC_MIXED = [
  "Hoca bilgili ama anlatımı hızlı, not tutmak zor. Slaytları iyi en azından.",
  "Sınavları zor ama adil, çalışırsan geçersin. Hazırlıksız gitme sakın.",
  "Ödevler öğretici ama fazla, diğer derslerle dengelemek zor oluyor.",
  "Genel olarak iyi bir ders, bazı konular sıkıcı olsa da faydalı.",
  "Hoca iyi niyetli ama açıklamaları bazen yetersiz, kitaptan çalışmak lazım.",
  "Lab saatleri faydalı ama yetersiz, daha fazla süre olsa iyi olurdu.",
  "Dersi geçmek zor değil ama AA almak için çok çalışmak lazım.",
  "Hoca araştırmacı olarak çok başarılı ama öğretmenlik tarafı biraz zayıf.",
  "Ders içeriği iyi, anlatım ortalama, genel olarak fena değil.",
  "Projelerde çok şey öğrendim ama zamanlamalar sıkışık olabiliyor.",
];

// ── Departments with proper Turkish characters ───────────────────────────

interface DeptSeed {
  code: string;
  name: string;
  instructors: { name: string; title: string }[];
  courses: { code: string; name: string; credits: number }[];
}

const DEPARTMENTS: DeptSeed[] = [
  {
    code: "CENG",
    name: "Bilgisayar Mühendisliği",
    instructors: [
      { name: "Halit Oğuztüzün", title: "Prof. Dr." },
      { name: "Ahmet Coşar", title: "Prof. Dr." },
      { name: "Ferda Nur Alpaslan", title: "Prof. Dr." },
      { name: "Nihan Kesim Çiçekli", title: "Prof. Dr." },
      { name: "İsmail Hakkı Toroslu", title: "Prof. Dr." },
      { name: "Sinan Kalkan", title: "Prof. Dr." },
      { name: "Pınar Karagöz", title: "Prof. Dr." },
      { name: "İsmail Sengör Altıngövde", title: "Prof. Dr." },
      { name: "Ahmet Oğuz Akyüz", title: "Prof. Dr." },
      { name: "Murat Manguoğlu", title: "Prof. Dr." },
      { name: "Ertan Onur", title: "Prof. Dr." },
      { name: "Faruk Polat", title: "Prof. Dr." },
      { name: "Uluç Saranlı", title: "Prof. Dr." },
      { name: "Yusuf Sahillioğlu", title: "Prof. Dr." },
      { name: "Erol Şahin", title: "Doç. Dr." },
      { name: "Emre Akbaş", title: "Doç. Dr." },
      { name: "Pelin Angın Ülküer", title: "Doç. Dr." },
      { name: "Ramazan Gökberk Cinbiş", title: "Doç. Dr." },
      { name: "Şeyda Ertekin", title: "Doç. Dr." },
      { name: "Hüseyin Aydın", title: "Dr. Öğr. Üyesi" },
      { name: "Çağrı Toraman", title: "Dr. Öğr. Üyesi" },
      { name: "Hakan Yıldız", title: "Dr. Öğr. Üyesi" },
      { name: "Onur Tolga Şehitoğlu", title: "Dr." },
      { name: "Cevat Şener", title: "Dr." },
    ],
    courses: [
      { code: "CENG111", name: "Introduction to Computer Engineering", credits: 3 },
      { code: "CENG140", name: "C Programming", credits: 4 },
      { code: "CENG213", name: "Data Structures", credits: 4 },
      { code: "CENG222", name: "Statistical Methods for Comp. Eng.", credits: 3 },
      { code: "CENG223", name: "Discrete Computational Structures", credits: 3 },
      { code: "CENG232", name: "Logic Design", credits: 4 },
      { code: "CENG242", name: "Programming Language Concepts", credits: 3 },
      { code: "CENG280", name: "Formal Languages and Abstract Machines", credits: 3 },
      { code: "CENG315", name: "Algorithms", credits: 3 },
      { code: "CENG331", name: "Computer Organization", credits: 4 },
      { code: "CENG334", name: "Introduction to Operating Systems", credits: 4 },
      { code: "CENG336", name: "Intro to Embedded Systems Development", credits: 3 },
      { code: "CENG350", name: "Software Engineering", credits: 3 },
      { code: "CENG351", name: "Database Management Systems", credits: 3 },
      { code: "CENG384", name: "Signals and Systems for Comp. Eng.", credits: 3 },
      { code: "CENG477", name: "Introduction to Computer Graphics", credits: 3 },
      { code: "CENG492", name: "Computer Eng. Design II", credits: 4 },
    ],
  },
  {
    code: "EEE",
    name: "Elektrik-Elektronik Mühendisliği",
    instructors: [
      { name: "Nevzat Güneri Gençer", title: "Prof. Dr." },
      { name: "Tayfun Akın", title: "Prof. Dr." },
      { name: "Aydın Alatan", title: "Prof. Dr." },
      { name: "Özlem Aydın Çivi", title: "Prof. Dr." },
      { name: "Barış Bayram", title: "Prof. Dr." },
      { name: "Cengiz Beşikçi", title: "Prof. Dr." },
      { name: "Tolga Çiloğlu", title: "Prof. Dr." },
      { name: "Gülbin Dural", title: "Prof. Dr." },
      { name: "Murat Eyüboğlu", title: "Prof. Dr." },
      { name: "Murat Göl", title: "Prof. Dr." },
      { name: "Haluk Külah", title: "Prof. Dr." },
      { name: "Umut Orguner", title: "Prof. Dr." },
      { name: "Afşar Saranlı", title: "Prof. Dr." },
      { name: "Engin Tuncer", title: "Prof. Dr." },
      { name: "İlkay Ulusoy", title: "Prof. Dr." },
      { name: "Elif Uysal", title: "Prof. Dr." },
      { name: "Ozan Keysan", title: "Doç. Dr." },
      { name: "Figen Öktem Seven", title: "Doç. Dr." },
      { name: "Mustafa Mert Ankaralı", title: "Doç. Dr." },
      { name: "Elif Vural", title: "Doç. Dr." },
      { name: "Selçuk Yerci", title: "Doç. Dr." },
      { name: "Elif Tuğçe Ceran Arslan", title: "Dr. Öğr. Üyesi" },
      { name: "Ulaş Karaağaç", title: "Dr. Öğr. Üyesi" },
      { name: "Murat Temiz", title: "Dr. Öğr. Üyesi" },
    ],
    courses: [
      { code: "EEE102", name: "Circuit Analysis", credits: 4 },
      { code: "EEE202", name: "Electronic Circuits", credits: 4 },
      { code: "EEE212", name: "Microprocessors", credits: 4 },
      { code: "EEE230", name: "Signals and Systems", credits: 3 },
      { code: "EEE281", name: "Electric Circuits", credits: 4 },
      { code: "EEE301", name: "Electromagnetic Field Theory", credits: 3 },
      { code: "EEE311", name: "Electronics II", credits: 3 },
      { code: "EEE361", name: "Electromechanical Energy Conversion", credits: 3 },
      { code: "EEE391", name: "Basics of Signals and Systems", credits: 3 },
      { code: "EEE404", name: "Digital Signal Processing", credits: 3 },
      { code: "EEE463", name: "Static Power Conversion", credits: 3 },
    ],
  },
  {
    code: "ME",
    name: "Makina Mühendisliği",
    instructors: [
      { name: "Serkan Dağ", title: "Prof. Dr." },
      { name: "Zafer Dursunkaya", title: "Prof. Dr." },
      { name: "Cemil Yamalı", title: "Prof. Dr." },
      { name: "Merve Erdal", title: "Doç. Dr." },
      { name: "Burak Arda", title: "Dr. Öğr. Üyesi" },
    ],
    courses: [
      { code: "ME201", name: "Thermodynamics", credits: 4 },
      { code: "ME210", name: "Strength of Materials", credits: 4 },
      { code: "ME220", name: "Fluid Mechanics", credits: 3 },
      { code: "ME301", name: "Heat Transfer", credits: 3 },
      { code: "ME307", name: "Machine Elements", credits: 3 },
    ],
  },
  {
    code: "CE",
    name: "İnşaat Mühendisliği",
    instructors: [
      { name: "Ahmet Yakut", title: "Prof. Dr." },
      { name: "İsmail Özgür Yaman", title: "Prof. Dr." },
      { name: "Güney Özcebe", title: "Prof. Dr." },
      { name: "Elif Çağda Kandemir", title: "Dr. Öğr. Üyesi" },
    ],
    courses: [
      { code: "CE203", name: "Strength of Materials I", credits: 4 },
      { code: "CE222", name: "Structural Analysis", credits: 3 },
      { code: "CE340", name: "Reinforced Concrete", credits: 3 },
      { code: "CE361", name: "Soil Mechanics", credits: 3 },
    ],
  },
  {
    code: "IE",
    name: "Endüstri Mühendisliği",
    instructors: [
      { name: "Canan Sepil", title: "Prof. Dr." },
      { name: "Sinan Gürel", title: "Prof. Dr." },
      { name: "Oya Karaşöy", title: "Doç. Dr." },
      { name: "Sedef Meral", title: "Doç. Dr." },
    ],
    courses: [
      { code: "IE220", name: "Probability and Statistics", credits: 3 },
      { code: "IE301", name: "Operations Research I", credits: 3 },
      { code: "IE302", name: "Operations Research II", credits: 3 },
      { code: "IE400", name: "Design Project", credits: 4 },
    ],
  },
  {
    code: "CHE",
    name: "Kimya Mühendisliği",
    instructors: [
      { name: "Gürkan Karakaş", title: "Prof. Dr." },
      { name: "Nihal Aydoğan", title: "Prof. Dr." },
      { name: "Görkem Çelik", title: "Doç. Dr." },
    ],
    courses: [
      { code: "CHE201", name: "Chemical Engineering Thermodynamics", credits: 3 },
      { code: "CHE300", name: "Mass Transfer", credits: 3 },
      { code: "CHE330", name: "Reaction Engineering", credits: 3 },
    ],
  },
  {
    code: "AEE",
    name: "Havacılık ve Uzay Mühendisliği",
    instructors: [
      { name: "Ozan Tekinalp", title: "Prof. Dr." },
      { name: "Yusuf Özyörük", title: "Prof. Dr." },
      { name: "Dilek Funda Kurtuluş", title: "Prof. Dr." },
      { name: "Sinan Eyi", title: "Doç. Dr." },
    ],
    courses: [
      { code: "AEE231", name: "Aerodynamics I", credits: 3 },
      { code: "AEE261", name: "Flight Mechanics", credits: 3 },
      { code: "AEE325", name: "Structural Analysis", credits: 3 },
      { code: "AEE462", name: "Space Mechanics", credits: 3 },
    ],
  },
  {
    code: "METE",
    name: "Metalurji ve Malzeme Mühendisliği",
    instructors: [
      { name: "Caner Durucan", title: "Prof. Dr." },
      { name: "Arcan Dericioğlu", title: "Prof. Dr." },
      { name: "Simge Pekcan", title: "Dr. Öğr. Üyesi" },
    ],
    courses: [
      { code: "METE200", name: "Materials Science", credits: 3 },
      { code: "METE300", name: "Phase Transformations", credits: 3 },
      { code: "METE330", name: "Ceramic Materials", credits: 3 },
    ],
  },
  {
    code: "ENVE",
    name: "Çevre Mühendisliği",
    instructors: [
      { name: "Filiz Dilek", title: "Prof. Dr." },
      { name: "İpek İmamoğlu", title: "Prof. Dr." },
      { name: "Barış Çallı", title: "Dr. Öğr. Üyesi" },
    ],
    courses: [
      { code: "ENVE201", name: "Environmental Chemistry", credits: 3 },
      { code: "ENVE301", name: "Water and Wastewater Treatment", credits: 3 },
      { code: "ENVE400", name: "Air Pollution", credits: 3 },
    ],
  },
  {
    code: "FDE",
    name: "Gıda Mühendisliği",
    instructors: [
      { name: "Hami Alpas", title: "Prof. Dr." },
      { name: "Serpil Şahin", title: "Prof. Dr." },
      { name: "Eda Cebeci", title: "Dr. Öğr. Üyesi" },
    ],
    courses: [
      { code: "FDE201", name: "Food Chemistry", credits: 3 },
      { code: "FDE300", name: "Food Microbiology", credits: 3 },
      { code: "FDE360", name: "Food Processing", credits: 3 },
    ],
  },
  {
    code: "MINE",
    name: "Maden Mühendisliği",
    instructors: [
      { name: "Bahtiyar Ünver", title: "Prof. Dr." },
      { name: "Hakan Başarır", title: "Prof. Dr." },
    ],
    courses: [
      { code: "MINE201", name: "Mining Geology", credits: 3 },
      { code: "MINE310", name: "Rock Mechanics", credits: 3 },
    ],
  },
  {
    code: "GEOE",
    name: "Jeoloji Mühendisliği",
    instructors: [
      { name: "Vedat Toprak", title: "Prof. Dr." },
      { name: "Nuretdin Kaymakcı", title: "Prof. Dr." },
    ],
    courses: [
      { code: "GEOE201", name: "Mineralogy", credits: 3 },
      { code: "GEOE300", name: "Structural Geology", credits: 3 },
    ],
  },
  {
    code: "PETE",
    name: "Petrol ve Doğalgaz Mühendisliği",
    instructors: [
      { name: "Serhat Akın", title: "Prof. Dr." },
      { name: "Tanju Mehmetoğlu", title: "Prof. Dr." },
    ],
    courses: [
      { code: "PETE201", name: "Reservoir Rock Properties", credits: 3 },
      { code: "PETE301", name: "Reservoir Engineering", credits: 3 },
    ],
  },
  {
    code: "MATH",
    name: "Matematik",
    instructors: [
      { name: "Ferruh Özbudak", title: "Prof. Dr." },
      { name: "Oğuz Yılmaz", title: "Prof. Dr." },
      { name: "Ayşe Berkman", title: "Prof. Dr." },
      { name: "Ali Ülger", title: "Prof. Dr." },
      { name: "Canan Kaşıkcı", title: "Doç. Dr." },
    ],
    courses: [
      { code: "MATH119", name: "Calculus with Analytic Geometry", credits: 4 },
      { code: "MATH120", name: "Calculus of Functions of Several Variables", credits: 4 },
      { code: "MATH219", name: "Introduction to Differential Equations", credits: 4 },
      { code: "MATH260", name: "Basic Linear Algebra", credits: 3 },
    ],
  },
  {
    code: "PHYS",
    name: "Fizik",
    instructors: [
      { name: "Bayram Tekin", title: "Prof. Dr." },
      { name: "Altuğ Özpineci", title: "Prof. Dr." },
      { name: "Sadi Turgut", title: "Prof. Dr." },
      { name: "Mehmet Zeyrek", title: "Prof. Dr." },
    ],
    courses: [
      { code: "PHYS105", name: "General Physics I", credits: 4 },
      { code: "PHYS106", name: "General Physics II", credits: 4 },
      { code: "PHYS221", name: "Modern Physics", credits: 3 },
    ],
  },
  {
    code: "CHEM",
    name: "Kimya",
    instructors: [
      { name: "Cihangir Tanyeli", title: "Prof. Dr." },
      { name: "Metin Zora", title: "Prof. Dr." },
      { name: "Özdemir Doğan", title: "Prof. Dr." },
      { name: "Görkem Günbaş", title: "Doç. Dr." },
    ],
    courses: [
      { code: "CHEM101", name: "General Chemistry I", credits: 4 },
      { code: "CHEM102", name: "General Chemistry II", credits: 4 },
      { code: "CHEM221", name: "Organic Chemistry I", credits: 3 },
    ],
  },
  {
    code: "STAT",
    name: "İstatistik",
    instructors: [
      { name: "Özlem İlk", title: "Prof. Dr." },
      { name: "Ceylan Yozgatlıgil", title: "Doç. Dr." },
      { name: "Buğra Kaan Tiryaki", title: "Dr. Öğr. Üyesi" },
    ],
    courses: [
      { code: "STAT201", name: "Statistics I", credits: 3 },
      { code: "STAT202", name: "Statistics II", credits: 3 },
      { code: "STAT301", name: "Regression Analysis", credits: 3 },
    ],
  },
  {
    code: "BIO",
    name: "Biyoloji",
    instructors: [
      { name: "Mayda Gürsel", title: "Prof. Dr." },
      { name: "Can Özen", title: "Doç. Dr." },
    ],
    courses: [
      { code: "BIO111", name: "General Biology I", credits: 3 },
      { code: "BIO112", name: "General Biology II", credits: 3 },
      { code: "BIO301", name: "Genetics", credits: 3 },
    ],
  },
  {
    code: "BA",
    name: "İşletme",
    instructors: [
      { name: "Ramazan Sarı", title: "Prof. Dr." },
      { name: "Engin Küçükkaya", title: "Prof. Dr." },
      { name: "Aslıhan Salih", title: "Doç. Dr." },
    ],
    courses: [
      { code: "BA1101", name: "Introduction to Business", credits: 3 },
      { code: "BA2301", name: "Accounting", credits: 3 },
      { code: "BA3201", name: "Financial Management", credits: 3 },
    ],
  },
  {
    code: "ECON",
    name: "İktisat",
    instructors: [
      { name: "Nadir Öcal", title: "Prof. Dr." },
      { name: "Hakan Berument", title: "Prof. Dr." },
      { name: "Elif İncekara", title: "Doç. Dr." },
    ],
    courses: [
      { code: "ECON101", name: "Introduction to Economics I", credits: 3 },
      { code: "ECON102", name: "Introduction to Economics II", credits: 3 },
      { code: "ECON201", name: "Microeconomics", credits: 3 },
    ],
  },
  {
    code: "IR",
    name: "Uluslararası İlişkiler",
    instructors: [
      { name: "Oktay Tanrısever", title: "Prof. Dr." },
      { name: "Pınar Bilgin", title: "Prof. Dr." },
      { name: "Zana Çıtak", title: "Doç. Dr." },
    ],
    courses: [
      { code: "IR100", name: "Introduction to International Relations", credits: 3 },
      { code: "IR201", name: "Political History", credits: 3 },
      { code: "IR301", name: "International Law", credits: 3 },
    ],
  },
  {
    code: "ADM",
    name: "Siyaset Bilimi ve Kamu Yönetimi",
    instructors: [
      { name: "Ayşe Ayata", title: "Prof. Dr." },
      { name: "Galip Yalman", title: "Prof. Dr." },
      { name: "Pınar Akoğlu", title: "Doç. Dr." },
    ],
    courses: [
      { code: "ADM101", name: "Introduction to Political Science", credits: 3 },
      { code: "ADM201", name: "Turkish Political Life", credits: 3 },
      { code: "ADM303", name: "Public Policy", credits: 3 },
    ],
  },
  {
    code: "PSY",
    name: "Psikoloji",
    instructors: [
      { name: "Tülin Genbay", title: "Prof. Dr." },
      { name: "Bengi Öner", title: "Prof. Dr." },
      { name: "Banu Cankaya", title: "Doç. Dr." },
    ],
    courses: [
      { code: "PSY100", name: "Introduction to Psychology", credits: 3 },
      { code: "PSY201", name: "Developmental Psychology", credits: 3 },
      { code: "PSY301", name: "Social Psychology", credits: 3 },
    ],
  },
  {
    code: "SOC",
    name: "Sosyoloji",
    instructors: [
      { name: "Ayşe Saktanber", title: "Prof. Dr." },
      { name: "Helga Rittersberger", title: "Prof. Dr." },
    ],
    courses: [
      { code: "SOC101", name: "Introduction to Sociology I", credits: 3 },
      { code: "SOC102", name: "Introduction to Sociology II", credits: 3 },
    ],
  },
  {
    code: "PHIL",
    name: "Felsefe",
    instructors: [
      { name: "Ahmet İnam", title: "Prof. Dr." },
      { name: "David Grünberg", title: "Prof. Dr." },
      { name: "Elif Ergin", title: "Doç. Dr." },
    ],
    courses: [
      { code: "PHIL101", name: "Introduction to Philosophy", credits: 3 },
      { code: "PHIL201", name: "Ethics", credits: 3 },
      { code: "PHIL301", name: "Epistemology", credits: 3 },
    ],
  },
  {
    code: "HIST",
    name: "Tarih",
    instructors: [
      { name: "Recep Boztemur", title: "Prof. Dr." },
      { name: "Selçuk Dursun", title: "Prof. Dr." },
    ],
    courses: [
      { code: "HIST101", name: "History of Civilization I", credits: 3 },
      { code: "HIST102", name: "History of Civilization II", credits: 3 },
    ],
  },
  {
    code: "ARCH",
    name: "Mimarlık",
    instructors: [
      { name: "Güven Arif Sargın", title: "Prof. Dr." },
      { name: "Cana Bilsel", title: "Prof. Dr." },
      { name: "Berin Gür", title: "Doç. Dr." },
    ],
    courses: [
      { code: "ARCH101", name: "Architectural Design I", credits: 5 },
      { code: "ARCH102", name: "Architectural Design II", credits: 5 },
      { code: "ARCH301", name: "Building Technology", credits: 3 },
    ],
  },
  {
    code: "CRP",
    name: "Şehir ve Bölge Planlama",
    instructors: [
      { name: "Nil Uzun", title: "Prof. Dr." },
      { name: "Bahar Gedikli", title: "Doç. Dr." },
      { name: "Ela Babalık", title: "Doç. Dr." },
    ],
    courses: [
      { code: "CRP101", name: "Introduction to Planning", credits: 3 },
      { code: "CRP301", name: "Urban Planning", credits: 4 },
    ],
  },
  {
    code: "ID",
    name: "Endüstriyel Tasarım",
    instructors: [
      { name: "Owain Pedgley", title: "Prof. Dr." },
      { name: "Fatma Korkut", title: "Prof. Dr." },
      { name: "Naz Böke", title: "Doç. Dr." },
    ],
    courses: [
      { code: "ID101", name: "Introduction to Industrial Design", credits: 3 },
      { code: "ID201", name: "Product Design I", credits: 5 },
    ],
  },
  {
    code: "ECE",
    name: "Okul Öncesi Öğretmenliği",
    instructors: [
      { name: "Refika Olgan", title: "Prof. Dr." },
      { name: "Feyza Tantekin Erden", title: "Prof. Dr." },
      { name: "Hasibe Özlen Demircan", title: "Doç. Dr." },
    ],
    courses: [
      { code: "ECE100", name: "Introduction to Early Childhood Education", credits: 3 },
      { code: "ECE201", name: "Child Development", credits: 3 },
      { code: "ECE301", name: "Play in Education", credits: 3 },
    ],
  },
  {
    code: "EDS",
    name: "Eğitim Bilimleri",
    instructors: [
      { name: "Ali Yıldırım", title: "Prof. Dr." },
      { name: "Ahmet Ok", title: "Prof. Dr." },
      { name: "Cennet Engin Demir", title: "Doç. Dr." },
    ],
    courses: [
      { code: "EDS201", name: "Introduction to Education", credits: 3 },
      { code: "EDS301", name: "Measurement and Evaluation", credits: 3 },
    ],
  },
  {
    code: "FLE",
    name: "Yabancı Diller Eğitimi",
    instructors: [
      { name: "Nurdan Orakcı", title: "Prof. Dr." },
      { name: "Joshua Bear", title: "Dr. Öğr. Üyesi" },
      { name: "Betil Erol", title: "Doç. Dr." },
    ],
    courses: [
      { code: "FLE201", name: "Language Acquisition", credits: 3 },
      { code: "FLE301", name: "English Language Teaching Methods", credits: 3 },
    ],
  },
];

// ── Test users ───────────────────────────────────────────────────────────

const TEST_USERS = [
  { email: "test1@metu.edu.tr", password: "Test1234!", studentIdHash: "hash_001" },
  { email: "test2@metu.edu.tr", password: "Test1234!", studentIdHash: "hash_002" },
  { email: "test3@metu.edu.tr", password: "Test1234!", studentIdHash: "hash_003" },
  { email: "test4@metu.edu.tr", password: "Test1234!", studentIdHash: "hash_004" },
  { email: "test5@metu.edu.tr", password: "Test1234!", studentIdHash: "hash_005" },
  { email: "test6@metu.edu.tr", password: "Test1234!", studentIdHash: "hash_006" },
  { email: "test7@metu.edu.tr", password: "Test1234!", studentIdHash: "hash_007" },
  { email: "test8@metu.edu.tr", password: "Test1234!", studentIdHash: "hash_008" },
  { email: "e258043@metu.edu.tr", password: "Test1234!", studentIdHash: "hash_009" },
];

// ── Main seed ────────────────────────────────────────────────────────────

export async function main() {
  console.log("Seeding database...");

  await prisma.review.deleteMany();
  await prisma.courseSection.deleteMany();
  await prisma.course.deleteMany();
  await prisma.instructor.deleteMany();
  await prisma.department.deleteMany();
  await prisma.user.deleteMany();

  const departmentMap: Record<string, number> = {};
  for (const dept of DEPARTMENTS) {
    const created = await prisma.department.create({
      data: { code: dept.code, name: dept.name, university: "ODTÜ" },
    });
    departmentMap[dept.code] = created.id;
    console.log(`  Bölüm: ${dept.code} (id=${created.id})`);
  }

  const instructorMap: Record<string, number> = {};
  for (const dept of DEPARTMENTS) {
    for (const inst of dept.instructors) {
      const slug = slugify(inst.name, dept.code);
      const created = await prisma.instructor.create({
        data: { name: inst.name, title: inst.title, slug, departmentId: departmentMap[dept.code] },
      });
      instructorMap[`${inst.name}-${dept.code}`] = created.id;
    }
    console.log(`  ${dept.instructors.length} hoca → ${dept.code}`);
  }

  const courseMap: Record<string, number> = {};
  for (const dept of DEPARTMENTS) {
    for (const c of dept.courses) {
      const created = await prisma.course.create({
        data: { code: c.code, name: c.name, credits: c.credits, departmentId: departmentMap[dept.code] },
      });
      courseMap[c.code] = created.id;
    }
    console.log(`  ${dept.courses.length} ders → ${dept.code}`);
  }

  // ── CENG: explicit course-instructor sections ──────────────────────────

  let sectionCount = 0;

  for (const [courseCode, instructorNames] of Object.entries(CENG_COURSE_MAP)) {
    if (!courseMap[courseCode]) continue;
    for (const instName of instructorNames) {
      const instId = instructorMap[`${instName}-CENG`];
      if (!instId) { console.warn(`  ⚠ CENG hoca bulunamadı: ${instName}`); continue; }
      // Current semester + 1-2 past semesters
      const pastSems = [...SEMESTERS].filter(s => s !== CURRENT_SEM).sort(() => Math.random() - 0.5).slice(0, randInt(1, 2));
      for (const sem of [CURRENT_SEM, ...pastSems]) {
        try {
          await prisma.courseSection.create({
            data: { courseId: courseMap[courseCode], instructorId: instId, semester: sem },
          });
          sectionCount++;
        } catch { /* skip dup */ }
      }
    }
  }
  console.log(`  ${sectionCount} CENG section oluşturuldu`);

  // ── Other departments: random but ensure coverage ──────────────────────

  for (const dept of DEPARTMENTS) {
    if (dept.code === "CENG") continue;
    const deptInstIds = dept.instructors.map(i => instructorMap[`${i.name}-${dept.code}`]);
    const deptCourseIds = dept.courses.map(c => courseMap[c.code]);

    for (const instId of deptInstIds) {
      const courseCount = Math.min(deptCourseIds.length, randInt(1, 3));
      const shuffled = [...deptCourseIds].sort(() => Math.random() - 0.5);
      for (let c = 0; c < courseCount; c++) {
        const semCount = randInt(1, 2);
        const semShuffled = [...SEMESTERS].sort(() => Math.random() - 0.5);
        for (let s = 0; s < semCount; s++) {
          try {
            await prisma.courseSection.create({
              data: { courseId: shuffled[c], instructorId: instId, semester: semShuffled[s] },
            });
            sectionCount++;
          } catch { /* skip */ }
        }
      }
    }
    for (const cid of deptCourseIds) {
      const cnt = await prisma.courseSection.count({ where: { courseId: cid } });
      if (cnt === 0) {
        try {
          await prisma.courseSection.create({
            data: { courseId: cid, instructorId: pick(deptInstIds), semester: pick(SEMESTERS) },
          });
          sectionCount++;
        } catch { /* skip */ }
      }
    }
  }
  console.log(`  Toplam ${sectionCount} section`);

  // ── Users ──────────────────────────────────────────────────────────────

  const userIds: number[] = [];
  for (const u of TEST_USERS) {
    const passwordHash = await bcrypt.hash(u.password, 10);
    const created = await prisma.user.create({
      data: { email: u.email, passwordHash, studentIdHash: u.studentIdHash, isVerified: true },
    });
    userIds.push(created.id);
  }
  console.log(`  ${userIds.length} kullanıcı`);

  // Review seed intentionally disabled.
  // Public-facing reviews should come from real users, not generated content.
  console.log("  Sentetik yorum oluşturma atlandı");
  console.log("Seed tamamlandı!");
}

main()
  .catch((e) => { console.error("Seed hatası:", e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
