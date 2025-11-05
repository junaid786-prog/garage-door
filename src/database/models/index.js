const fs = require('fs');
const path = require('path');
const sequelize = require('../connection');

const basename = path.basename(__filename);

const models = {};

const loadModels = () => {
  const files = fs.readdirSync(__dirname).filter((file) => {
    return file.indexOf('.') !== 0 && file !== basename && file.slice(-3) === '.js';
  });

  files.forEach((file) => {
    try {
      const model = require(path.join(__dirname, file));

      if (model && model.name) {
        models[model.name] = model;
      }
    } catch (error) {
      console.error(`Error loading model ${file}:`, error);
    }
  });

  Object.keys(models).forEach((modelName) => {
    if (models[modelName].associate) {
      models[modelName].associate(models);
    }
  });

  return models;
};

models.sequelize = sequelize;
models.Sequelize = sequelize.Sequelize;

module.exports = models;
module.exports.loadModels = loadModels;
