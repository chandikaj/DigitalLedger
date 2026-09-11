import assert from 'node:assert/strict';
import { buildMixedHTML, convertPipeTablesToHTML, hasPipeTableContent } from './tableUtils';

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
console.log('Pipe table conversion tests passed');