import { runAggregator } from '../server/sources/aggregator';

async function main() {
  console.log('Starting aggregator...');
  try {
    const result = await runAggregator();
    console.log('Aggregator completed!');
    console.log('Result:', JSON.stringify(result, null, 2));
  } catch (error) {
    console.error('Aggregator error:', error);
    process.exit(1);
  }
  process.exit(0);
}

main();
