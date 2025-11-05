const { DataTypes } = require('sequelize');
const bcrypt = require('bcrypt');
const sequelize = require('../connection');

const User = sequelize.define('User', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  email: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
    validate: {
      isEmail: true,
      notEmpty: true
    },
    set(value) {
      this.setDataValue('email', value?.toLowerCase());
    }
  },
  password: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: {
      len: [6, 100]
    }
  },
  firstName: {
    type: DataTypes.STRING,
    field: 'first_name',
    allowNull: true
  },
  lastName: {
    type: DataTypes.STRING,
    field: 'last_name',
    allowNull: true
  },
  phone: {
    type: DataTypes.STRING,
    allowNull: true,
    validate: {
      is: /^[\d\s\-\+\(\)]+$/
    }
  },
  role: {
    type: DataTypes.ENUM('admin', 'customer', 'technician'),
    defaultValue: 'customer',
    allowNull: false
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    field: 'is_active',
    defaultValue: true,
    allowNull: false
  },
  lastLoginAt: {
    type: DataTypes.DATE,
    field: 'last_login_at',
    allowNull: true
  }
}, {
  timestamps: true,
  paranoid: true,
  underscored: true,
  tableName: 'users',
  hooks: {
    beforeCreate: async (user) => {
      if (user.password) {
        user.password = await bcrypt.hash(user.password, 10);
      }
    },
    beforeUpdate: async (user) => {
      if (user.changed('password')) {
        user.password = await bcrypt.hash(user.password, 10);
      }
    }
  },
  defaultScope: {
    attributes: { exclude: ['password'] }
  },
  scopes: {
    withPassword: {
      attributes: {}
    },
    active: {
      where: { isActive: true }
    }
  }
});

User.prototype.validatePassword = async function(password) {
  const userWithPassword = await User.scope('withPassword').findByPk(this.id);
  return bcrypt.compare(password, userWithPassword.password);
};

User.prototype.getFullName = function() {
  return [this.firstName, this.lastName].filter(Boolean).join(' ');
};

User.prototype.updateLastLogin = async function() {
  this.lastLoginAt = new Date();
  await this.save();
};

User.associate = (models) => {
  // Add associations here when other models are created
};

module.exports = User;