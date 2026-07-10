#!/usr/bin/env node

import { strict as assert } from "node:assert";
import { startStaticAppServer } from "../app/tools/serve-app.mjs";

const { server, url } = await startStaticAppServer({ port: 0 });

try {
  const indexResponse = await fetch(`${url}/`);
  assert.equal(indexResponse.status, 200);
  assert.match(indexResponse.headers.get("content-type") || "", /^text\/html/);
  assert.match(await indexResponse.text(), /Bible App Reader/);

  for (const path of ["/styles.css", "/styles-polish.css", "/app.js", "/src/reader-picker-flow.js", "/src/original-language-study-flow.js"]) {
    const response = await fetch(`${url}${path}?v=server-test`);
    assert.equal(response.status, 200, `${path} should return 200`);
    const body = await response.text();
    assert.ok(body.length > 0, `${path} should return a non-empty body`);
  }

  const headResponse = await fetch(`${url}/styles.css`, { method: "HEAD" });
  assert.equal(headResponse.status, 200);
  assert.ok(Number(headResponse.headers.get("content-length")) > 0);
  assert.equal(await headResponse.text(), "");

  const missingResponse = await fetch(`${url}/missing-file.js`);
  assert.equal(missingResponse.status, 404);

  console.log(
    JSON.stringify(
      {
        status: "ok",
        assertions: 15,
        base_url: url,
      },
      null,
      2,
    ),
  );
} finally {
  await new Promise((resolveClose) => server.close(resolveClose));
}
