/**
 * Run once to create the admin account:
 *   node scripts/createAdmin.js
 */
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const mongoose = require('mongoose');
const Admin    = require('../models/Admin');

const EMAIL    = process.env.ADMIN_EMAIL    || 'admin@mru.edu.in';
const PASSWORD = process.env.ADMIN_PASSWORD || 'Admin@2026!';
const NAME     = process.env.ADMIN_NAME     || 'MRU Admin';

mongoose.connect(process.env.MONGO_URI).then(async () => {
  const exists = await Admin.findOne({ email: EMAIL });
  if (exists) { console.log('Admin already exists:', EMAIL); process.exit(0); }
  await Admin.create({ email: EMAIL, password: PASSWORD, name: NAME });
  console.log('✅ Admin created:', EMAIL);
  process.exit(0);
}).catch(err => { console.error(err); process.exit(1); });
