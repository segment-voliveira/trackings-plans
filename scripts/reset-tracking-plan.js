// const fs = require('fs');
// const path = require('path');
// const axios = require('axios');

// // Get environment variables
// const planDir = process.env.PLAN_DIR;
// const trackingPlanId = process.env.SEGMENT_TRACKING_PLAN_ID;
// const apiUrl = `https://api.segmentapis.com/tracking-plans/${trackingPlanId}/rules`;
// const apiKey = process.env.SEGMENT_API_KEY;

// console.log('API key:', apiKey);
// console.log('API URL:', apiUrl);
// console.log('Tracking Plan ID:', trackingPlanId);

// // Function to reset the tracking plan
// async function resetTrackingPlan() {
//   // File path to the JSON file containing the new rules
//   const filePath = path.join(planDir, 'current-rules.json');
//   console.log('Reading rules from file:', filePath);

//   // Read the JSON file
//   let rulesData;
//   try {
//     rulesData = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
//     console.log('Loaded rules:', rulesData);
//   } catch (error) {
//     console.error('Error reading file:', error.message);
//     return;
//   }

//   // Make the PUT request to reset the tracking plan rules
//   try {
//     const response = await axios.put(
//       apiUrl,
//       { rules: rulesData.rules },
//       {
//         headers: {
//           'Authorization': `Bearer ${apiKey}`,
//           'Content-Type': 'application/json'
//         },
//       }
//     );
//     console.log('Tracking plan successfully reset:', response.data);
//   } catch (error) {
//     console.error('Error resetting tracking plan:', error.response ? error.response.data : error.message);
//   }
// }

// // Run the reset function
// resetTrackingPlan();

const fs = require('fs');
const path = require('path');
const axios = require('axios');

const planDir = process.env.PLAN_DIR;
const trackingPlanId = process.env.SEGMENT_TRACKING_PLAN_ID;
const apiKey = process.env.SEGMENT_API_KEY;
const baseUrl = `https://api.segmentapis.com/tracking-plans/${trackingPlanId}`;
const paginationCount = 200;

async function fetchAllRules(cursor = null, accumulatedRules = []) {
  const params = new URLSearchParams({ 'pagination[count]': paginationCount.toString() });
  if (cursor) params.append('pagination[cursor]', cursor);

  const url = `${baseUrl}/rules?${params}`;
  console.log(`🔍 Fetching: ${url}`);

  try {
    const response = await axios.get(url, {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
    });

    const rules = response.data.data.rules || [];
    const pagination = response.data.data.pagination;
    accumulatedRules.push(...rules);

    if (pagination?.next) {
      return fetchAllRules(pagination.next, accumulatedRules);
    } else {
      return accumulatedRules;
    }
  } catch (error) {
    console.error('❌ Error fetching rules:', error.response?.data || error.message);
    return accumulatedRules;
  }
}

async function deleteRulesInBatches(rules) {
  const chunkSize = 200;
  for (let i = 0; i < rules.length; i += chunkSize) {
    const chunk = rules.slice(i, i + chunkSize).map(r => ({
      key: r.key,
      type: r.type,
      version: r.version,
    }));

    try {
      await axios.delete(`${baseUrl}/rules`, {
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        data: { rules: chunk },
      });
      console.log(`🧹 Deleted ${chunk.length} rules (batch ${i / chunkSize + 1})`);
    } catch (error) {
      console.error('❌ Error deleting rules:', error.response?.data || error.message);
    }
  }
}

async function uploadProdChunks() {
  const files = fs.readdirSync(planDir)
    .filter(f => f.startsWith('current-rules') && f.endsWith('.json'))
    .sort();

  for (const file of files) {
    const filePath = path.join(planDir, file);
    const content = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    const rules = content.rules;

    const chunkSize = 200;
    for (let i = 0; i < rules.length; i += chunkSize) {
      const chunk = rules.slice(i, i + chunkSize);

      try {
        await axios.post(`${baseUrl}/rules`, { rules: chunk }, {
          headers: {
            Authorization: `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
          },
        });
        console.log(`✅ Uploaded ${chunk.length} rules from ${file} (chunk ${i / chunkSize + 1})`);
      } catch (error) {
        console.error(`❌ Failed to upload chunk ${i / chunkSize + 1} from ${file}:`, error.response?.data || error.message);
      }
    }
  }
}

async function main() {
  console.log(`🚨 Resetting tracking plan: ${trackingPlanId}`);

  const existingRules = await fetchAllRules();
  console.log(`📦 Found ${existingRules.length} rules to delete`);

  if (existingRules.length > 0) {
    await deleteRulesInBatches(existingRules);
  }

  console.log('📤 Uploading production rules...');
  await uploadProdChunks();

  console.log('🎉 Tracking plan reset complete.');
}

main();

