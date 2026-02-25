const { DataTypes } = require('sequelize');
const sequelize = require('../connection');

const ServiceTitanJobType = sequelize.define(
  'ServiceTitanJobType',
  {
    id: {
      type: DataTypes.BIGINT,
      primaryKey: true,
      autoIncrement: false, // ID comes from ServiceTitan, not auto-generated
      comment: 'ServiceTitan job type ID',
    },
    name: {
      type: DataTypes.STRING(255),
      allowNull: false,
      comment: 'ServiceTitan job type name',
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
      field: 'is_active',
      comment: 'Whether this job type is currently active',
    },
  },
  {
    tableName: 'service_titan_job_types',
    timestamps: true,
    underscored: true,
    indexes: [
      {
        fields: ['name'],
        comment: 'Index for searching by job type name',
      },
      {
        fields: ['is_active'],
        comment: 'Index for filtering active job types',
      },
    ],
  }
);

module.exports = ServiceTitanJobType;
