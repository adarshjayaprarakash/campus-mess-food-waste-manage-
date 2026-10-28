// Sample student profile
export const studentProfile = {
  id: 'STU2024001',
  name: 'Adarsh Jayaprakash',
  rollNo: 'CS21B001',
  hostel: 'Nilgiri Block',
  room: 'N-204',
  year: '3rd Year',
  department: 'Computer Science & Engineering',
  avatarInitials: 'AJ',
};

// Meal schedule with cutoff times and sample menu
export const meals = [
  {
    id: 'breakfast',
    label: 'Breakfast',
    icon: '🌅',
    time: '7:30 AM – 9:00 AM',
    cutoffTime: '9:00 PM',   // previous night
    cutoffLabel: 'Opt-out by 9:00 PM (previous night)',
    menu: ['Idli & Sambar', 'Coconut Chutney', 'Boiled Egg', 'Banana', 'Tea / Coffee'],
    color: '#f59e0b',
    colorLight: 'rgba(245,158,11,0.12)',
  },
  {
    id: 'lunch',
    label: 'Lunch',
    icon: '☀️',
    time: '12:30 PM – 2:00 PM',
    cutoffTime: '9:00 AM',
    cutoffLabel: 'Opt-out by 9:00 AM (same day)',
    menu: ['Rice & Dal', 'Mix Veg Curry', 'Rasam', 'Curd', 'Papad', 'Pickle'],
    color: '#10b981',
    colorLight: 'rgba(16,185,129,0.12)',
  },
  {
    id: 'dinner',
    label: 'Dinner',
    icon: '🌙',
    time: '7:30 PM – 9:00 PM',
    cutoffTime: '4:00 PM',
    cutoffLabel: 'Opt-out by 4:00 PM (same day)',
    menu: ['Chapati', 'Paneer Butter Masala', 'Jeera Rice', 'Dal Tadka', 'Salad', 'Buttermilk'],
    color: '#6366f1',
    colorLight: 'rgba(99,102,241,0.12)',
  },
];

// Weekly summary sample data (last 7 days)
export const weeklyHistory = [
  { day: 'Mon', breakfast: 'eating', lunch: 'eating', dinner: 'skipping' },
  { day: 'Tue', breakfast: 'eating', lunch: 'skipping', dinner: 'eating' },
  { day: 'Wed', breakfast: 'skipping', lunch: 'eating', dinner: 'eating' },
  { day: 'Thu', breakfast: 'eating', lunch: 'eating', dinner: 'eating' },
  { day: 'Fri', breakfast: 'skipping', lunch: 'skipping', dinner: 'eating' },
  { day: 'Sat', breakfast: 'eating', lunch: 'eating', dinner: 'skipping' },
  { day: 'Sun', breakfast: 'eating', lunch: 'eating', dinner: 'eating' },
];

// Campus mess info
export const messInfo = {
  name: 'Nilgiri Mess',
  capacity: 450,
  todayRegistered: 387,
};
