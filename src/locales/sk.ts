export default {
  navigation: {
    dashboard: 'Nástenka',
    timetables: 'Rozvrhy',
    requirements: 'Požiadavky',
    admin: 'Správa',
  },
  login: {
    welcome: 'Vitajte v Elysa',
    subtitle: 'Inteligentný rozvrhový systém pre FEI STU',
    email: 'Email',
    password: 'Heslo',
    loginButton: 'Prihlásiť sa s Elysa účtom',
    orContinueWith: 'Alebo pokračovať cez',
    aisLogin: 'AIS STU',
    tmsTitle: 'Systém správy rozvrhov',
    copyright: '© 2025 Nicolas Ondráš',
  },
  user: {
    defaultName: 'Používateľ',
    profile: 'Profil',
    settings: 'Nastavenia',
    logout: 'Odhlásiť sa',
  },
  requirements: {
    myRequirements: 'Moje požiadavky',
    subject: 'Predmet',
    personalScheduleInfo: 'Nastavenie požiadaviek pre váš osobný rozvrh.',
    loginPrompt: 'Pre nastavenie osobných požiadaviek sa prosím prihláste.',
    selectSubject: 'Vyberte predmet',
    selectSubjectDescription: 'Vyberte predmet pre nastavenie požiadaviek',
    searchSubjects: 'Hľadať predmety...',
    selectConstraintPrompt: 'Vyberte typ obmedzenia',
    selectConstraintDescription:
      'Vyberte typ obmedzenia z ľavého menu pre pokračovanie',
    constraints: {
      timeRange: 'Časové rozmedzie',
      dailyLimit: 'Denný limit',
      room: 'Miestnosť',
    },
  },
  constraints: {
    timeRange: {
      title: 'Výber časového rozmedzia',
      selectLevel: 'Vyberte úroveň nedostupnosti:',
      levels: {
        clear: 'Vymazať',
        weak: 'Slabá',
        normal: 'Normálna',
        strong: 'Silná',
      },
      instructions:
        'Kliknutím a ťahaním označte vašu nedostupnosť. Použite rôzne farby na označenie úrovne nedostupnosti. Pre rýchle vymazanie použite pravé tlačidlo myši.',
      clearAll: 'Vymazať všetko',
      confirmClear: 'Naozaj chcete vymazať všetky označenia dostupnosti?',
      cleared: 'Vymazané',
      clearedMessage: 'Všetky označenia dostupnosti boli vymazané.',
    },
  },
}
