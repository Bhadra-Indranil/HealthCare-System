const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const ROLES = {
  ADMIN: "admin",
  DOCTOR: "doctor",
  NURSE: "nurse",
  RECEPTIONIST: "receptionist",
};

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: {
    type: String,
    enum: Object.values(ROLES),
    default: ROLES.RECEPTIONIST,
  },
  department: { type: String, default: "General" },
  specialization: { type: String },
  licenseNumber: { type: String },
  createdAt: { type: Date, default: Date.now },
  lastLogin: { type: Date },
  isActive: { type: Boolean, default: true },
});

const User = mongoose.model("User", userSchema);

// Static methods
User.createUser = async function (userData) {
  try {
    // Check if user already exists
    const existingUser = await this.findOne({ email: userData.email });
    if (existingUser) {
      throw new Error("User already exists");
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(userData.password, salt);

    // Create user
    const user = new this({
      name: userData.name,
      email: userData.email,
      password: hashedPassword,
      role: userData.role,
      department: userData.department,
      specialization: userData.specialization,
      licenseNumber: userData.licenseNumber,
    });

    await user.save();
    return user.toObject({
      transform: (doc, ret) => {
        delete ret.password;
        return ret;
      },
    });
  } catch (error) {
    throw error;
  }
};

User.authenticateUser = async function (email, password) {
  try {
    const user = await this.findOne({ email });
    if (!user) {
      throw new Error("Invalid credentials");
    }

    if (!user.isActive) {
      throw new Error("Account is deactivated");
    }

    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      throw new Error("Invalid credentials");
    }

    // Update last login
    user.lastLogin = new Date();
    await user.save();

    // Generate JWT token
    const token = jwt.sign(
      {
        userId: user._id,
        email: user.email,
        role: user.role,
      },
      process.env.JWT_SECRET,
      { expiresIn: "8h" }
    );

    return {
      token,
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        department: user.department,
        specialization: user.specialization,
      },
    };
  } catch (error) {
    throw error;
  }
};

User.getUserById = async function (userId) {
  try {
    const user = await this.findById(userId).select("-password");
    return user;
  } catch (error) {
    throw error;
  }
};

User.updateUser = async function (userId, updateData) {
  try {
    // If password is being updated, hash it
    if (updateData.password) {
      const salt = await bcrypt.genSalt(10);
      updateData.password = await bcrypt.hash(updateData.password, salt);
    }

    const user = await this.findByIdAndUpdate(
      userId,
      { $set: updateData },
      { new: true }
    ).select("-password");

    if (!user) {
      throw new Error("User not found");
    }

    return user;
  } catch (error) {
    throw error;
  }
};

User.deactivateUser = async function (userId) {
  try {
    const user = await this.findByIdAndUpdate(
      userId,
      { $set: { isActive: false } },
      { new: true }
    );

    if (!user) {
      throw new Error("User not found");
    }

    return true;
  } catch (error) {
    throw error;
  }
};

User.getRoles = function () {
  return ROLES;
};

module.exports = { User, ROLES };
