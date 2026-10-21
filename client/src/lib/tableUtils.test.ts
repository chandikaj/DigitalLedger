import assert from 'node:assert/strict';
import { buildMixedHTML, convertArticleVisualsToHTML, convertPipeTablesToHTML, hasPipeTableContent } from './tableUtils';

const collapsed = '| Audit Area | Strong Support | Common Failure | | :--- | :--- | :--- | | Ownership | Wallet register | Mixed assets | | Existence | Explorer balances | Missing logs |';
const converted = convertPipeTablesToHTML(collapsed);
assert.equal(hasPipeTableContent(collapsed), true);
assert.equal((converted.match(/<th>/g) || []).length, 3);
assert.equal((converted.match(/<td>/g) || []).length, 6);
assert.match(converted, /class="article-table"/);
assert.match(converted, /Ownership/);
assert.equal(convertPipeTablesToHTML('Some text | with a pipe'), 'Some text | with a pipe');
const multiline = '| A | B | C |\n| --- | --- | --- |\n| One || Three |';
assert.match(buildMixedHTML(multiline), /<td><\/td>/);
assert.equal((buildMixedHTML(multiline).match(/<tr>/g) || []).length, 2);
assert.match(buildMixedHTML('| A | B |\n| --- | --- |\n| <script> | safe |'), /&lt;script&gt;/);

const spendingChart = [
  'A paragraph before the chart.',
  'AI Inference Spending Forecast (2025 vs. 2030) ----------------',
  '2025: $120 Billion [████] 2030: $885 Billion [████████████]',
  '*Agentic & Reasoning Inference Growth (2026): +219%',
].join('\n');
const convertedSpending = convertArticleVisualsToHTML(spendingChart);
assert.match(convertedSpending, /class="article-visual article-bar-visual"/);
assert.match(convertedSpending, /AI Inference Spending Forecast/);
assert.match(convertedSpending, /2025/);
assert.match(convertedSpending, /\$120 Billion/);
assert.match(convertedSpending, /2030/);
assert.match(convertedSpending, /\$885 Billion/);
assert.match(convertedSpending, /A paragraph before the chart\./);
assert.match(convertedSpending, /\+219%/);

const workflowChart = [
  'Finance Leader AI Prioritization by Workflow',
  '--------------------------------------------',
  'Planning & Forecasting: 51% [████████████]',
  'Financial Reporting: 42% [██████████]',
  'Liquidity & Cash Flow: 39% [█████████]',
  'Invoice Processing: 30% [███████]',
  'Capital Allocation: 24% [█████]',
].join('\n');
const convertedWorkflow = convertArticleVisualsToHTML(workflowChart);
assert.match(convertedWorkflow, /class="article-visual article-bar-visual"/);
assert.match(convertedWorkflow, /Planning &amp; Forecasting/);
assert.match(convertedWorkflow, /Capital Allocation/);
assert.match(convertedWorkflow, /width:100\.00%/);

const finOpsDiagram = [
  '+--------------------------------------------------------------+',
  'AI FINOPS ARCHITECTURES',
  '+-------------------------------+-----------------------------+',
  'PASSIVE COST-PLANE TOOLS | ACTIVE REQUEST-PATH GATEWAYS',
  '(Finout, Vantage, CloudZero) | (LiteLLM, Portkey, Kosmoy,',
  '| Databricks Unity AI Gateway)',
  '• Ingest billing data via APIs | • Act as real-time proxies',
  '• Daily refresh schedule | • Inline data-path execution',
  '• Post-mortem reporting | • Pre-execution hard spend caps',
  '+-------------------------------+-----------------------------+',
].join('\n');
const convertedFinOps = convertArticleVisualsToHTML(finOpsDiagram);
assert.match(convertedFinOps, /class="article-visual article-comparison-visual"/);
assert.match(convertedFinOps, /PASSIVE COST-PLANE TOOLS/);
assert.match(convertedFinOps, /ACTIVE REQUEST-PATH GATEWAYS/);
assert.match(convertedFinOps, /Databricks Unity AI Gateway/);
assert.match(convertedFinOps, /Pre-execution hard spend caps/);

const ordinaryProse = 'Ordinary prose stays exactly as it was.';
assert.equal(convertArticleVisualsToHTML(ordinaryProse), ordinaryProse);
assert.match(convertPipeTablesToHTML(multiline), /class="article-table"/);

const boxedAsciiTable = [
  'Audit Readiness: Strong Support vs. Common Failures',
  '+-------------+--------------------+---------------------+',
  '| Audit Area  | Strong Support     | Common Failure     |',
  '+-------------+--------------------+---------------------+',
  '| Ownership   | Wallet register    | Mixed assets       |',
  '| Existence   | Explorer balances  | Missing logs       |',
  '+-------------+--------------------+---------------------+',
].join('\n');
const convertedBoxedTable = convertPipeTablesToHTML(boxedAsciiTable);
assert.match(convertedBoxedTable, /class="article-table"/);
assert.match(convertedBoxedTable, /Strong Support/);
assert.match(convertedBoxedTable, /Explorer balances/);
assert.doesNotMatch(convertedBoxedTable, /\+-------------/);

const wrappedFinanceMetrics = [
  'Finance Leader AI Prioritization by Workflow -------------------------',
  'Planning & Forecasting: 51% [████████████] Financial Reporting: 42% [██████████]',
  'Liquidity & Cash Flow: 39% [█████████] Invoice Processing: 30% [███████] Capital Allocation: 24% [█████]',
].join('\n');
const convertedFinanceMetrics = convertArticleVisualsToHTML(wrappedFinanceMetrics);
assert.match(convertedFinanceMetrics, /class="article-visual article-bar-visual"/);
assert.match(convertedFinanceMetrics, /Planning &amp; Forecasting/);
assert.match(convertedFinanceMetrics, /Capital Allocation/);
console.log('Article table and visual conversion tests passed');