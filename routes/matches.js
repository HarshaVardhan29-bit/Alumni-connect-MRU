const router = require('express').Router();
const User = require('../models/User');
const { protect } = require('../middleware/auth');

function computeScore(student, alumni) {
  let score = 0;

  const sIndustry = (student.targetIndustry || student.industry || '').toLowerCase().trim();
  const aIndustry = (alumni.industry || '').toLowerCase().trim();
  const sGoals    = (student.careerGoals || '').toLowerCase();
  const aSkills   = (alumni.skills || []).join(' ').toLowerCase();
  const aBio      = (alumni.bio || '').toLowerCase();
  const aDesig    = (alumni.designation || '').toLowerCase();

  // Industry match (40 pts)
  if (sIndustry && aIndustry) {
    if (sIndustry === aIndustry) score += 40;
    else if (sIndustry.includes(aIndustry) || aIndustry.includes(sIndustry)) score += 25;
    else {
      const sWords = sIndustry.split(/\s+/);
      const aWords = aIndustry.split(/\s+/);
      if (sWords.some(w => aWords.includes(w))) score += 15;
    }
  }

  // Career goals vs skills/bio/designation (up to 35 pts)
  if (sGoals) {
    const goalWords = sGoals.split(/\W+/).filter(w => w.length > 3);
    goalWords.forEach(w => {
      if (aSkills.includes(w)) score += 4;
      if (aBio.includes(w)) score += 2;
      if (aDesig.includes(w)) score += 3;
    });
    score = Math.min(score, 75);
  }

  // Base score so everyone gets at least something
  score = Math.max(score, 20);

  // Small random variance ±8 to simulate ML refinement
  score += Math.floor(Math.random() * 16) - 8;

  return Math.min(Math.max(score, 20), 99);
}

// GET /api/matches
router.get('/', protect, async (req, res) => {
  try {
    const student = req.user;
    const alumni = await User.find({ role: 'alumni', isActive: true }).select('-password');
    const scored = alumni.map(a => ({ ...a.toObject(), matchScore: computeScore(student, a) }));
    scored.sort((a, b) => b.matchScore - a.matchScore);
    res.json(scored.slice(0, 12));
  } catch (err) { res.status(500).json({ message: err.message }); }
});

module.exports = router;
