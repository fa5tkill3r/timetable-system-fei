export default {
  navigation: {
    dashboard: 'Dashboard',
    timetables: 'Timetables',
    requirements: 'Requirements',
    admin: 'Admin',
  },
  login: {
    welcome: 'Welcome to Elysa',
    subtitle: 'The intelligent timetable system for FEI STU',
    email: 'Email',
    password: 'Password',
    loginButton: 'Login with Elysa Account',
    orContinueWith: 'Or continue with',
    aisLogin: 'AIS STU',
    tmsTitle: 'Timetable Management System',
    copyright: '© 2025 Nicolas Ondráš',
  },
  user: {
    defaultName: 'User',
    profile: 'Profile',
    settings: 'Settings',
    logout: 'Log out',
  },
  requirements: {
    myRequirements: 'My requirements',
    subject: 'Subject',
    personalScheduleInfo: 'Setting requirements for your personal schedule.',
    loginPrompt: 'Please log in to set personal requirements.',
    selectSubject: 'Select Subject',
    selectSubjectDescription: 'Choose a subject to set requirements for',
    searchSubjects: 'Search subjects...',
    selectConstraintPrompt: 'Select a constraint type',
    selectConstraintDescription:
      'Choose a constraint type from the menu on the left to continue',
    constraints: {
      timeRange: 'Time range',
      dailyLimit: 'Daily limit',
      room: 'Room',
    },
  },
  constraints: {
    timeRange: {
      title: 'Time Range Select',
      selectLevel: 'Select Unavailability Level:',
      levels: {
        clear: 'Clear',
        weak: 'Weak',
        normal: 'Normal',
        strong: 'Strong',
      },
      instructions:
        'Click and drag to mark your unavailability. Use different colors to indicate the level of unavailability. For quick clearing, use the right mouse button.',
      clearAll: 'Clear All',
      confirmClear: 'Are you sure you want to clear all availability markings?',
      cleared: 'Cleared',
      clearedMessage: 'All availability markings have been cleared.',
    },
  },
}
