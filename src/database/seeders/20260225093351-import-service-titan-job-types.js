'use strict';

const fs = require('fs');
const path = require('path');

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Path to the CSV file relative to project root
    const csvPath = path.resolve(__dirname, '../../../../.claude/Ref_docs/export_ServiceTitanData.xlsx.csv');

    // Read and parse CSV file
    console.log('Reading ServiceTitan job types from CSV...');
    const csvContent = fs.readFileSync(csvPath, 'utf-8');
    const lines = csvContent.split('\n').filter((line) => line.trim() !== '');

    // Skip header row and parse data
    const jobTypes = [];
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      // Parse CSV line: jobtypeid,jobtype_name
      // Handle potential BOM character at start of file
      const cleanLine = line.replace(/^\uFEFF/, '');
      const [id, name] = cleanLine.split(',');

      if (id && name) {
        jobTypes.push({
          id: parseInt(id.trim(), 10),
          name: name.trim(),
          is_active: true,
          created_at: new Date(),
          updated_at: new Date(),
        });
      }
    }

    console.log(`Parsed ${jobTypes.length} job types from CSV`);

    // Delete all existing job types first (clean slate for daily refreshes)
    console.log('Deleting existing job types...');
    await queryInterface.bulkDelete('service_titan_job_types', null, {});

    // Insert new job types
    console.log('Importing job types...');
    await queryInterface.bulkInsert('service_titan_job_types', jobTypes, {});

    console.log(`✅ Successfully imported ${jobTypes.length} ServiceTitan job types`);
  },

  async down(queryInterface, Sequelize) {
    // Remove all imported job types
    await queryInterface.bulkDelete('service_titan_job_types', null, {});
    console.log('✅ Removed all ServiceTitan job types');
  },
};
