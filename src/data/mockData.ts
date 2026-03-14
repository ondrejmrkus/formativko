// Fake Czech student names, classes, lessons, proofs and evaluations for all screens

export interface Student {
  id: string;
  firstName: string;
  lastName: string;
  classIds: string[];
}

export interface SchoolClass {
  id: string;
  name: string;
  studentIds: string[];
}

export interface Lesson {
  id: string;
  title: string;
  classId: string;
  subject: string;
  status: "ongoing" | "prepared" | "past";
}

export interface ProofOfLearning {
  id: string;
  title: string;
  type: "text" | "voice" | "camera" | "file";
  date: string;
  note: string;
  studentIds: string[];
  lessonId?: string;
  fileName?: string;
}

export interface Evaluation {
  id: string;
  studentId: string;
  status: "draft" | "final" | "none";
  subject: string;
  period: string;
  text: string;
}

// ---------- Students ----------
export const students: Student[] = [
  // 6.A — 24 žáků
  { id: "s1", firstName: "Adam", lastName: "Novák", classIds: ["c1"] },
  { id: "s2", firstName: "Barbora", lastName: "Svobodová", classIds: ["c1"] },
  { id: "s3", firstName: "Cyril", lastName: "Dvořák", classIds: ["c1"] },
  { id: "s4", firstName: "Dana", lastName: "Černá", classIds: ["c1"] },
  { id: "s5", firstName: "Emil", lastName: "Procházka", classIds: ["c1"] },
  { id: "s6", firstName: "Františka", lastName: "Kučerová", classIds: ["c1"] },
  { id: "s7", firstName: "Gustav", lastName: "Veselý", classIds: ["c1"] },
  { id: "s8", firstName: "Hana", lastName: "Horáková", classIds: ["c1"] },
  { id: "s9", firstName: "Ivan", lastName: "Němec", classIds: ["c1"] },
  { id: "s10", firstName: "Jana", lastName: "Marková", classIds: ["c1"] },
  { id: "s11", firstName: "Karel", lastName: "Pokorný", classIds: ["c1"] },
  { id: "s12", firstName: "Lucie", lastName: "Pospíšilová", classIds: ["c1"] },
  { id: "s13", firstName: "Martin", lastName: "Hájek", classIds: ["c1"] },
  { id: "s14", firstName: "Nela", lastName: "Králová", classIds: ["c1"] },
  { id: "s15", firstName: "Ondřej", lastName: "Jelínek", classIds: ["c1"] },
  { id: "s16", firstName: "Petra", lastName: "Růžičková", classIds: ["c1"] },
  { id: "s17", firstName: "Richard", lastName: "Beneš", classIds: ["c1"] },
  { id: "s18", firstName: "Simona", lastName: "Fialová", classIds: ["c1"] },
  { id: "s19", firstName: "Tomáš", lastName: "Sedláček", classIds: ["c1"] },
  { id: "s20", firstName: "Veronika", lastName: "Šťastná", classIds: ["c1"] },
  { id: "s21", firstName: "Vladimír", lastName: "Kolář", classIds: ["c1"] },
  { id: "s22", firstName: "Zuzana", lastName: "Navrátilová", classIds: ["c1"] },
  { id: "s23", firstName: "Jakub", lastName: "Čermák", classIds: ["c1"] },
  { id: "s24", firstName: "Klára", lastName: "Vaněčková", classIds: ["c1"] },

  // 7.B — 18 žáků
  { id: "s25", firstName: "Aleš", lastName: "Marek", classIds: ["c2"] },
  { id: "s26", firstName: "Blanka", lastName: "Urbanová", classIds: ["c2"] },
  { id: "s27", firstName: "David", lastName: "Kratochvíl", classIds: ["c2"] },
  { id: "s28", firstName: "Eliška", lastName: "Kopecká", classIds: ["c2"] },
  { id: "s29", firstName: "Filip", lastName: "Šimek", classIds: ["c2"] },
  { id: "s30", firstName: "Gabriela", lastName: "Závodná", classIds: ["c2"] },
  { id: "s31", firstName: "Hugo", lastName: "Blažek", classIds: ["c2"] },
  { id: "s32", firstName: "Irena", lastName: "Polák", classIds: ["c2"] },
  { id: "s33", firstName: "Jiří", lastName: "Kříž", classIds: ["c2"] },
  { id: "s34", firstName: "Karolína", lastName: "Holubová", classIds: ["c2"] },
  { id: "s35", firstName: "Lukáš", lastName: "Staněk", classIds: ["c2"] },
  { id: "s36", firstName: "Markéta", lastName: "Vlčková", classIds: ["c2"] },
  { id: "s37", firstName: "Nikolas", lastName: "Bartoš", classIds: ["c2"] },
  { id: "s38", firstName: "Olga", lastName: "Hrubá", classIds: ["c2"] },
  { id: "s39", firstName: "Pavel", lastName: "Doležal", classIds: ["c2"] },
  { id: "s40", firstName: "Radka", lastName: "Krejčí", classIds: ["c2"] },
  { id: "s41", firstName: "Štěpán", lastName: "Tuček", classIds: ["c2"] },
  { id: "s42", firstName: "Tereza", lastName: "Beránková", classIds: ["c2"] },

  // 8.A — 12 žáků
  { id: "s43", firstName: "Aneta", lastName: "Moravcová", classIds: ["c3"] },
  { id: "s44", firstName: "Boris", lastName: "Kadlec", classIds: ["c3"] },
  { id: "s45", firstName: "Cecílie", lastName: "Říhová", classIds: ["c3"] },
  { id: "s46", firstName: "Dominik", lastName: "Fiala", classIds: ["c3"] },
  { id: "s47", firstName: "Eva", lastName: "Šimková", classIds: ["c3"] },
  { id: "s48", firstName: "František", lastName: "Zeman", classIds: ["c3"] },
  { id: "s49", firstName: "Hedvika", lastName: "Tomanová", classIds: ["c3"] },
  { id: "s50", firstName: "Igor", lastName: "Havlíček", classIds: ["c3"] },
  { id: "s51", firstName: "Julie", lastName: "Vávra", classIds: ["c3"] },
  { id: "s52", firstName: "Kamil", lastName: "Brož", classIds: ["c3"] },
  { id: "s53", firstName: "Lenka", lastName: "Pešková", classIds: ["c3"] },
  { id: "s54", firstName: "Matyáš", lastName: "Holý", classIds: ["c3"] },

  // 9.C — 28 žáků
  { id: "s55", firstName: "Adéla", lastName: "Soukupová", classIds: ["c4"] },
  { id: "s56", firstName: "Bruno", lastName: "Šulc", classIds: ["c4"] },
  { id: "s57", firstName: "Daniela", lastName: "Hrušková", classIds: ["c4"] },
  { id: "s58", firstName: "Eduard", lastName: "Mach", classIds: ["c4"] },
  { id: "s59", firstName: "Fatima", lastName: "Kovářová", classIds: ["c4"] },
  { id: "s60", firstName: "Gregor", lastName: "Pánek", classIds: ["c4"] },
  { id: "s61", firstName: "Helena", lastName: "Jandová", classIds: ["c4"] },
  { id: "s62", firstName: "Ivo", lastName: "Růžek", classIds: ["c4"] },
  { id: "s63", firstName: "Jitka", lastName: "Brabcová", classIds: ["c4"] },
  { id: "s64", firstName: "Kryštof", lastName: "Lysý", classIds: ["c4"] },
  { id: "s65", firstName: "Linda", lastName: "Nováčková", classIds: ["c4"] },
  { id: "s66", firstName: "Michal", lastName: "Tichý", classIds: ["c4"] },
  { id: "s67", firstName: "Natálie", lastName: "Dostálová", classIds: ["c4"] },
  { id: "s68", firstName: "Oldřich", lastName: "Sýkora", classIds: ["c4"] },
  { id: "s69", firstName: "Patricie", lastName: "Urbanová", classIds: ["c4"] },
  { id: "s70", firstName: "Radim", lastName: "Matoušek", classIds: ["c4"] },
  { id: "s71", firstName: "Sára", lastName: "Konečná", classIds: ["c4"] },
  { id: "s72", firstName: "Tadeáš", lastName: "Jílek", classIds: ["c4"] },
  { id: "s73", firstName: "Ursula", lastName: "Čechová", classIds: ["c4"] },
  { id: "s74", firstName: "Václav", lastName: "Holub", classIds: ["c4"] },
  { id: "s75", firstName: "Xénie", lastName: "Malá", classIds: ["c4"] },
  { id: "s76", firstName: "Yveta", lastName: "Šrámková", classIds: ["c4"] },
  { id: "s77", firstName: "Zdeněk", lastName: "Bureš", classIds: ["c4"] },
  { id: "s78", firstName: "Alžběta", lastName: "Vlasáková", classIds: ["c4"] },
  { id: "s79", firstName: "Bedřich", lastName: "Hálek", classIds: ["c4"] },
  { id: "s80", firstName: "Ctibor", lastName: "Veselka", classIds: ["c4"] },
  { id: "s81", firstName: "Dorota", lastName: "Smolíková", classIds: ["c4"] },
  { id: "s82", firstName: "Evžen", lastName: "Kubát", classIds: ["c4"] },

  // 6.B — 16 žáků
  { id: "s83", firstName: "Anna", lastName: "Procházková", classIds: ["c5"] },
  { id: "s84", firstName: "Břetislav", lastName: "Hora", classIds: ["c5"] },
  { id: "s85", firstName: "Čeněk", lastName: "Vlk", classIds: ["c5"] },
  { id: "s86", firstName: "Dita", lastName: "Bílková", classIds: ["c5"] },
  { id: "s87", firstName: "Ema", lastName: "Řezníčková", classIds: ["c5"] },
  { id: "s88", firstName: "Felix", lastName: "Mrázek", classIds: ["c5"] },
  { id: "s89", firstName: "Greta", lastName: "Poláčková", classIds: ["c5"] },
  { id: "s90", firstName: "Hubert", lastName: "Stránský", classIds: ["c5"] },
  { id: "s91", firstName: "Ida", lastName: "Kolářová", classIds: ["c5"] },
  { id: "s92", firstName: "Josef", lastName: "Mareček", classIds: ["c5"] },
  { id: "s93", firstName: "Květa", lastName: "Doubravová", classIds: ["c5"] },
  { id: "s94", firstName: "Libor", lastName: "Pecka", classIds: ["c5"] },
  { id: "s95", firstName: "Milena", lastName: "Tůmová", classIds: ["c5"] },
  { id: "s96", firstName: "Norbert", lastName: "Kadlček", classIds: ["c5"] },
  { id: "s97", firstName: "Otýlie", lastName: "Šťovíčková", classIds: ["c5"] },
  { id: "s98", firstName: "Přemysl", lastName: "Janoušek", classIds: ["c5"] },
];

// ---------- Classes ----------
export const classes: SchoolClass[] = [
  { id: "c1", name: "6.A", studentIds: students.filter(s => s.classIds.includes("c1")).map(s => s.id) },
  { id: "c2", name: "7.B", studentIds: students.filter(s => s.classIds.includes("c2")).map(s => s.id) },
  { id: "c3", name: "8.A", studentIds: students.filter(s => s.classIds.includes("c3")).map(s => s.id) },
  { id: "c4", name: "9.C", studentIds: students.filter(s => s.classIds.includes("c4")).map(s => s.id) },
  { id: "c5", name: "6.B", studentIds: students.filter(s => s.classIds.includes("c5")).map(s => s.id) },
];

// ---------- Lessons ----------
export const lessons: Lesson[] = [
  { id: "l1", title: "Zlomky a desetinná čísla", classId: "c1", subject: "Matematika", status: "ongoing" },
  { id: "l2", title: "Popis osoby — slohová práce", classId: "c1", subject: "Český jazyk", status: "prepared" },
  { id: "l3", title: "Fotosyntéza a dýchání rostlin", classId: "c2", subject: "Přírodopis", status: "prepared" },
  { id: "l4", title: "Velká Morava a Přemyslovci", classId: "c3", subject: "Dějepis", status: "past" },
  { id: "l5", title: "Present Simple vs Continuous", classId: "c2", subject: "Angličtina", status: "ongoing" },
  { id: "l6", title: "Rovnice s jednou neznámou", classId: "c4", subject: "Matematika", status: "prepared" },
  { id: "l7", title: "Vesmír a sluneční soustava", classId: "c3", subject: "Fyzika", status: "past" },
  { id: "l8", title: "Básnické prostředky", classId: "c1", subject: "Český jazyk", status: "past" },
];

// ---------- Proofs of Learning ----------
export const proofsOfLearning: ProofOfLearning[] = [
  { id: "p1", title: "Práce s textem — čtení s porozuměním", type: "text", date: "2026-03-10", note: "Žák dokázal identifikovat hlavní myšlenku textu a odpovědět na doplňující otázky. Pracoval samostatně, aktivně se zapojoval.", studentIds: ["s1", "s2"], lessonId: "l2" },
  { id: "p2", title: "Skupinová práce — zlomky", type: "camera", date: "2026-03-08", note: "Fotografie tabule se skupinovou prací.", studentIds: ["s1", "s3", "s5"], lessonId: "l1", fileName: "skupinova-prace.jpg" },
  { id: "p3", title: "Ústní odpověď — Přemyslovci", type: "voice", date: "2026-03-05", note: "Žák popsal nástup Přemyslovců na trůn. Odpověď byla věcná, ale chyběly detaily o Bořivojovi.", studentIds: ["s43"], lessonId: "l4" },
  { id: "p4", title: "Domácí úkol — rovnice", type: "file", date: "2026-03-12", note: "Odevzdaný domácí úkol, 8/10 správně.", studentIds: ["s55", "s56"], lessonId: "l6", fileName: "domaci-ukol-rovnice.pdf" },
  { id: "p5", title: "Aktivita v hodině — fotosyntéza", type: "text", date: "2026-03-11", note: "Žákyně výborně vysvětlila proces fotosyntézy vlastními slovy. Prokázala hluboké porozumění tématu.", studentIds: ["s26"], lessonId: "l3" },
  { id: "p6", title: "Prezentace — sluneční soustava", type: "file", date: "2026-02-28", note: "Prezentace o planetách, kvalitní grafické zpracování.", studentIds: ["s43", "s44", "s45"], lessonId: "l7", fileName: "planety-prezentace.pptx" },
];

// ---------- Evaluations ----------
export const evaluations: Evaluation[] = [
  { id: "e1", studentId: "s1", status: "draft", subject: "Český jazyk", period: "1. pololetí", text: "Adam se v hodinách českého jazyka aktivně zapojuje do diskuzí a prokazuje dobré porozumění literárním textům. Jeho písemný projev se zlepšuje, ale stále je třeba pracovat na pravopisu." },
  { id: "e2", studentId: "s2", status: "final", subject: "Český jazyk", period: "1. pololetí", text: "Barbora je výborná studentka s vynikajícím písemným projevem. Její slohové práce jsou kreativní a gramaticky správné." },
  { id: "e3", studentId: "s3", status: "none", subject: "Matematika", period: "1. pololetí", text: "" },
  { id: "e4", studentId: "s25", status: "draft", subject: "Přírodopis", period: "1. pololetí", text: "Aleš projevuje zájem o přírodní vědy, aktivně se zapojuje do laboratorních prací. Potřebuje zlepšit přípravu na testy." },
  { id: "e5", studentId: "s43", status: "final", subject: "Dějepis", period: "1. pololetí", text: "Aneta má vynikající znalosti historických událostí. Její ústní projev je srozumitelný a logicky strukturovaný." },
];

// ---------- Helpers ----------
export function getStudentsByClass(classId: string): Student[] {
  const cls = classes.find(c => c.id === classId);
  if (!cls) return [];
  return students
    .filter(s => cls.studentIds.includes(s.id))
    .sort((a, b) => a.lastName.localeCompare(b.lastName, "cs"));
}

export function getStudentById(id: string): Student | undefined {
  return students.find(s => s.id === id);
}

export function getClassById(id: string): SchoolClass | undefined {
  return classes.find(c => c.id === id);
}

export function getClassesForStudent(studentId: string): SchoolClass[] {
  return classes.filter(c => c.studentIds.includes(studentId));
}

export function getProofsForStudent(studentId: string): ProofOfLearning[] {
  return proofsOfLearning.filter(p => p.studentIds.includes(studentId));
}

export function getStudentDisplayName(student: Student): string {
  return `${student.firstName} ${student.lastName}`;
}

export function getStudentShortName(student: Student): string {
  return `${student.firstName} ${student.lastName.charAt(0)}.`;
}
