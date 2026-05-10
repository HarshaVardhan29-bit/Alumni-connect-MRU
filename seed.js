require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('./models/User');
const Post = require('./models/Post');

const users = [
  {
    firstName: 'Demo',
    lastName: 'Student',
    email: 'student@mru.edu.in',
    password: 'demo1234',
    role: 'student',
    industry: 'Technology',
    targetIndustry: 'Technology',
    careerGoals: 'I want to become a software engineer at a top tech company. Interested in full stack development, system design, and product management.',
    bio: 'Final year CSE student at MRU. Passionate about building products.',
    isActive: true,
  },
  {
    firstName: 'Demo',
    lastName: 'Alumni',
    email: 'alumni@mru.edu.in',
    password: 'demo1234',
    role: 'alumni',
    industry: 'Technology',
    company: 'Google',
    designation: 'Senior Software Engineer',
    batch: '2020',
    skills: ['React', 'Node.js', 'System Design', 'Leadership', 'Product Strategy'],
    bio: 'MRU CSE 2020 batch. Currently SDE at Google. Love mentoring juniors and helping them crack top tech companies.',
    isActive: true,
  },
  {
    firstName: 'Priya',
    lastName: 'Sharma',
    email: 'priya@mru.edu.in',
    password: 'demo1234',
    role: 'alumni',
    industry: 'Product Management',
    company: 'Microsoft',
    designation: 'Product Manager',
    batch: '2019',
    skills: ['Product Strategy', 'UX Research', 'Agile', 'Leadership', 'Data Analysis'],
    bio: 'PM at Microsoft. MRU 2019 batch. Passionate about building user-centric products. Happy to mentor students interested in PM roles.',
    isActive: true,
  },
  {
    firstName: 'Rahul',
    lastName: 'Verma',
    email: 'rahul@mru.edu.in',
    password: 'demo1234',
    role: 'alumni',
    industry: 'Technology',
    company: 'Amazon',
    designation: 'SDE II',
    batch: '2021',
    skills: ['Java', 'AWS', 'Microservices', 'DSA', 'System Design'],
    bio: 'SDE II at Amazon Web Services. MRU 2021 batch. Cracked FAANG after 2 attempts — happy to share my journey.',
    isActive: true,
  },
  {
    firstName: 'Ananya',
    lastName: 'Singh',
    email: 'ananya@mru.edu.in',
    password: 'demo1234',
    role: 'alumni',
    industry: 'Design',
    company: 'Flipkart',
    designation: 'Senior UX Designer',
    batch: '2020',
    skills: ['Figma', 'User Research', 'Prototyping', 'Design Systems', 'Branding'],
    bio: 'Senior UX Designer at Flipkart. MRU Design 2020. Mentor for students interested in UI/UX and product design careers.',
    isActive: true,
  },
];

const postTemplates = [
  {
    email: 'alumni@mru.edu.in',
    text: `Just got promoted to Senior SWE at Google 🎉 4 years since MRU and the journey has been incredible. To all students — the grind is worth it. Focus on DSA, build real projects, never stop learning. #MRUAlumni #Google #CareerGrowth`,
    media: [
      { type: 'image', url: 'https://images.unsplash.com/photo-1573804633927-bfcbcd909acd?w=800&q=80' },
    ],
  },
  {
    email: 'priya@mru.edu.in',
    text: `Hot take: The best PMs aren't the ones who know the most — they're the ones who listen the most. Spent 3 hours with users this week and learned more than any dashboard could tell me. Talk to real users. #ProductManagement #MRUAlumni`,
    media: [
      { type: 'image', url: 'https://images.unsplash.com/photo-1552664730-d307ca884978?w=800&q=80' },
    ],
  },
  {
    email: 'rahul@mru.edu.in',
    text: `Cracked Amazon L5 after failing L4 twice. What changed:\n\n1. Stopped memorising, started understanding patterns\n2. Weekly mock interviews with peers\n3. Wrote down every mistake\n\nPersistence > talent. #FAANG #DSA #MRU`,
  },
  {
    email: 'ananya@mru.edu.in',
    text: `Redesigned Flipkart's checkout flow and reduced drop-off by 23% 📉 We removed 4 steps users didn't notice were there. Good design is invisible — your job is to get out of the user's way. #UXDesign #MRUAlumni`,
    media: [
      { type: 'image', url: 'https://images.unsplash.com/photo-1561070791-2526d30994b5?w=800&q=80' },
      { type: 'image', url: 'https://images.unsplash.com/photo-1586717791821-3f44a563fa4c?w=800&q=80' },
    ],
  },
  {
    email: 'alumni@mru.edu.in',
    text: `Open to mentoring 2-3 MRU students this semester for SWE/FAANG prep:\n• Resume reviews\n• Mock technical interviews\n• System design walkthroughs\n\nDrop a connection request. No cost, just paying it forward 🙌 #Mentorship #MRU`,
    media: [
      { type: 'video', url: 'https://www.youtube.com/embed/dQw4w9WgXcQ' },
    ],
  },
  {
    email: 'priya@mru.edu.in',
    text: `The #AIMatching feature matched me with 8 students based on shared interest in PM and AI. Already had 2 sessions this week — compatibility score was 91% and it shows. This is exactly what alumni networking should look like. #MRUAlumni`,
    media: [
      { type: 'image', url: 'https://images.unsplash.com/photo-1531482615713-2afd69097998?w=800&q=80' },
    ],
  },
  {
    email: 'rahul@mru.edu.in',
    text: `System Design tip: When asked to design a URL shortener, most candidates jump to the schema. Start with scale requirements first. 100 URLs/day vs 100M/day are completely different problems. Always clarify before you design. #SWE`,
    media: [
      { type: 'image', url: 'https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=800&q=80' },
    ],
  },
  {
    email: 'ananya@mru.edu.in',
    text: `Just wrapped a design sprint at Flipkart. 5 days, 12 user interviews, 3 prototypes, 1 winner. The design sprint framework is one of the most underrated tools in product dev. Read Jake Knapp's book if you haven't. #DesignSprint`,
    media: [
      { type: 'image', url: 'https://images.unsplash.com/photo-1542744173-8e7e53415bb0?w=800&q=80' },
      { type: 'image', url: 'https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?w=800&q=80' },
    ],
  },
  {
    email: 'student@mru.edu.in',
    text: `Just got my first open source PR merged into a React library! Small bug fix but the maintainer merged it in 24 hours. If you're a student building your portfolio — open source is the fastest way to get real-world experience. #MRU2026`,
    media: [
      { type: 'image', url: 'https://images.unsplash.com/photo-1461749280684-dccba630e2f6?w=800&q=80' },
    ],
  },
  {
    email: 'priya@mru.edu.in',
    text: `Reminder for students applying to PM roles: your resume should answer ONE question — "What impact did you create?" Not what you did. Not what you built. What changed because of you? Numbers, outcomes. That's what gets the interview. #PM`,
  },
];

async function seed() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log('Connected to MongoDB');

  // Seed users
  const userMap = {};
  for (const u of users) {
    let existing = await User.findOne({ email: u.email });
    if (!existing) {
      existing = await User.create(u);
      console.log(`Created user: ${u.email}`);
    } else {
      console.log(`Already exists: ${u.email}`);
    }
    userMap[u.email] = existing;
  }

  // Seed posts
  const existingPostCount = await Post.countDocuments();
  if (existingPostCount > 0) {
    console.log(`Posts already seeded (${existingPostCount} found), skipping.`);
  } else {
    const allUserIds = Object.values(userMap).map(u => u._id);
    for (const pt of postTemplates) {
      const author = userMap[pt.email];
      if (!author) continue;
      // random likes from other users
      const likers = allUserIds.filter(id => String(id) !== String(author._id));
      const likeCount = Math.floor(Math.random() * likers.length) + 1;
      const likes = likers.slice(0, likeCount);
      // random retweets
      const rtCount = Math.floor(Math.random() * 3);
      const retweets = likers.slice(0, rtCount);

      await Post.create({ author: author._id, text: pt.text, media: pt.media || [], likes, retweets });
      console.log(`Created post by ${author.firstName}`);
    }
  }

  console.log('\nDemo accounts:');
  console.log('Student  → student@mru.edu.in  / demo1234');
  console.log('Alumni   → alumni@mru.edu.in   / demo1234');
  console.log('Priya    → priya@mru.edu.in    / demo1234');
  console.log('Rahul    → rahul@mru.edu.in    / demo1234');
  console.log('Ananya   → ananya@mru.edu.in   / demo1234');

  await mongoose.disconnect();
  process.exit(0);
}

seed().catch(err => { console.error(err); process.exit(1); });
