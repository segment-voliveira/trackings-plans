const fs = require('fs');
const path = require('path');
const axios = require('axios');

const planDir = process.env.PLAN_DIR;
const trackingPlanId = process.env.SEGMENT_TRACKING_PLAN_ID;
const apiKey = process.env.SEGMENT_API_KEY;
const baseUrl = `https://api.segmentapis.com/tracking-plans/${trackingPlanId}`;
const paginationCount = 200;

console.log(`📍 Using PLAN_DIR: ${planDir}`);
console.log(`🆔 Tracking Plan ID: ${trackingPlanId}`);

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

    console.log(`📄 Fetched ${rules.length} rules (total so far: ${accumulatedRules.length})`);

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
  console.log(`🧹 Deleting ${rules.length} rules in batches of ${chunkSize}`);

  for (let i = 0; i < rules.length; i += chunkSize) {
    const chunk = rules.slice(i, i + chunkSize).map(r => ({
      key: r.key,
      type: r.type,
      version: r.version,
    }));

    console.log(`🗑️ Deleting batch ${i / chunkSize + 1}, size: ${chunk.length}`);

    try {
      await axios.delete(`${baseUrl}/rules`, {
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        data: { rules: chunk },
      });
      console.log(`✅ Deleted ${chunk.length} rules`);
    } catch (error) {
      console.error(`❌ Error deleting batch ${i / chunkSize + 1}:`, error.response?.data || error.message);
    }
  }
}

async function uploadProdChunks() {
  console.log(`📁 Checking directory: ${planDir}`);
  const files = fs.readdirSync(planDir)
    .filter(f => f.startsWith('current-rules') && f.endsWith('.json'))
    .sort();

  console.log(`📦 Found ${files.length} rule file(s): ${files.join(', ')}`);

  for (const file of files) {
    const filePath = path.join(planDir, file);
    console.log(`📤 Reading file: ${filePath}`);

    const content = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    const rules = content.rules;

    if (!Array.isArray(rules) || rules.length === 0) {
      console.warn(`⚠️ No rules found in ${file}. Skipping.`);
      continue;
    }

    const chunkSize = 200;
    for (let i = 0; i < rules.length; i += chunkSize) {
      const chunk = rules.slice(i, i + chunkSize);
      console.log(`🚀 Uploading ${chunk.length} rules from ${file} (chunk ${i / chunkSize + 1})`);

      try {
        const res = await axios.patch(`${baseUrl}/rules`, { rules: chunk }, {
          headers: {
            Authorization: `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
          },
        });

        console.log(`✅ Uploaded chunk ${i / chunkSize + 1} from ${file}. Response:`, res.status);
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
  } else {
    console.log('📭 No rules to delete.');
  }

  console.log(`🧪 Resolved directory path: ${planDir}`);
  console.log(`📄 Directory contents: ${fs.existsSync(planDir) ? fs.readdirSync(planDir).join(', ') : 'Directory does not exist'}`);
  console.log('📤 Uploading production rules...');
  await uploadProdChunks();

  console.log('🎉 Tracking plan reset complete.');
}

main();

