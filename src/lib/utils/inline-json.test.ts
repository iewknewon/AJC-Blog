import test from 'node:test';
import assert from 'node:assert/strict';

import { serializeInlineJson } from './inline-json';

test('serializeInlineJson 会安全转义 script 结束标签和特殊字符', () => {
  const payload = {
    title: 'Test',
    content: '</script><script>alert(1)</script>',
    note: 'line\u2028separator\u2029done',
    html: '<div>& value</div>',
  };

  const serialized = serializeInlineJson(payload);

  assert.ok(!serialized.includes('</script>'));
  assert.ok(serialized.includes('\\u003C/script\\u003E'));
  assert.ok(serialized.includes('\\u003Cdiv\\u003E\\u0026 value\\u003C/div\\u003E'));
  assert.deepEqual(JSON.parse(serialized), payload);
});
