const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');

// Get command-line arguments
const args = process.argv.slice(2);

// Ensure correct arguments are provided
if (args.length < 2) {
  console.error('Usage: node scripts/generate-yaml-rules.js <planDir> <saveDir>');
  process.exit(1);
}

// Assign command-line arguments
const planDir = args[0];  // e.g., plans/prod/<TP_NAME>
const saveDir = args[1];  // e.g., tracking-rules/<TP_NAME>
const jsonFilePath = path.join(planDir, 'current-rules.json');

// Ensure save directory exists
if (!fs.existsSync(saveDir)) {
  fs.mkdirSync(saveDir, { recursive: true });
}

console.log('Plan Directory:', planDir);
console.log('JSON File Path:', jsonFilePath);
console.log('Save Directory:', saveDir);

// Load JSON data
let trackingPlanData;
try {
  trackingPlanData = JSON.parse(fs.readFileSync(jsonFilePath, 'utf-8'));
  console.log('Loaded tracking plan data:', trackingPlanData);
} catch (error) {
  console.error('Error reading JSON file:', error.message);
  process.exit(1);
}


function generateYAMLFiles() {
  trackingPlanData.rules.forEach((rule) => {
    // Extract labels from jsonSchema if present
    const labels = rule.jsonSchema?.labels || {};

    // Extract properties and required fields
    const properties = rule.jsonSchema?.properties?.properties?.properties || {};
    const requiredFields = rule.jsonSchema?.properties?.properties?.required || [];

    // Transform properties to include `required: true` where applicable
    const transformedProperties = {};
    Object.keys(properties).forEach((key) => {
      transformedProperties[key] = {
        ...properties[key],
        ...(requiredFields.includes(key) ? { required: true } : {}) // Add required flag if needed
      };
    });

    // Construct the final YAML-compatible object
    const yamlObject = {
      rules: [
        {
          key: rule.key,
          type: rule.type,
          description: rule.key, // Assigning description same as key (modify if needed)
          version: rule.version,
          labels, // Directly placing labels
          properties: transformedProperties, // Flattened properties
        }
      ]
    };

    // Generate the YAML content
    const yamlContent = yaml.dump(yamlObject, { noRefs: true });

    // Create file path
    const fileName = `${rule.key.replace(/ /g, '_')}.yml`;
    const filePath = path.join(saveDir, fileName);

    try {
      fs.writeFileSync(filePath, yamlContent);
      console.log(`Generated YAML file: ${filePath}`);
    } catch (error) {
      console.error(`Error writing YAML file ${fileName}:`, error.message);
    }
  });
}

// Run the function to generate YAML files
generateYAMLFiles();
