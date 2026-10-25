const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  name: {
    type: String,
    trim: true,
    default: ''
  },
  passwordHash: {
    type: String,
    select: false
  },
  clerkId: {
    type: String,
    sparse: true,
    index: true
  },
  role: {
    type: String,
    enum: ['admin', 'user'],
    default: 'user'
  }
}, {
  timestamps: true
});

userSchema.methods.comparePassword = async function(candidatePassword) {
  if (!this.passwordHash) return false;
  return bcrypt.compare(candidatePassword, this.passwordHash);
};

userSchema.statics.hashPassword = async function(plainPassword) {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(plainPassword, salt);
};

module.exports = mongoose.model('User', userSchema);
