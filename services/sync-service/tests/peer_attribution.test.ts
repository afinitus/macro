import jwt from "jsonwebtoken";
import { LoroDoc } from "loro-crdt";
import { Miniflare } from "miniflare";
import { beforeEach, expect, test } from "vitest";
import { FromPeer, FromRemote } from "../bebop/generated/schema";
import { createTestWebSocket, getTokenForDocument, setupMiniflare } from "./utils";

let mf: Miniflare;

beforeEach(async () => {
  mf = await setupMiniflare();
});

const documentId = "attribution-doc";

/** Connect with `claims`, register `peer`, and write one edit under it. The
 *  edit's ack proves the registration before it has been handled. */
async function editAs(claims: Record<string, string>, peer: bigint, text: string) {
  const token = jwt.sign(
    { document_id: documentId, access_level: "edit", exp: Math.floor(Date.now() / 1000) + 60, ...claims },
    "local",
  );
  const response = await mf.dispatchFetch(
    `http://localhost:8787/document/${documentId}/connect?token=${token}`,
    { headers: { Upgrade: "websocket" } },
  );
  const ws = response.webSocket!;
  const socket = createTestWebSocket(ws);
  ws.accept();
  const initialSync = FromRemote.decode(new Uint8Array((await socket.waitForNextMessage()) as ArrayBuffer));
  expect(initialSync.isRemoteInitialSync()).toBe(true);
  const doc = new LoroDoc();
  doc.setPeerId(peer);
  if (initialSync.isRemoteInitialSync()) doc.import(initialSync.value.snapshot);
  socket.send(FromPeer.fromPeerRegisterId({ peerid: peer }).encode());
  doc.getText("content").insert(0, text);
  doc.commit();
  socket.send(FromPeer.fromPeerUpdate({ updates: [doc.export({ mode: "update" })], id: crypto.randomUUID() }).encode());
  const ack = FromRemote.decode(new Uint8Array((await socket.waitForNextMessage()) as ArrayBuffer));
  expect(ack.isRemoteUpdateAck()).toBe(true);
  ws.close();
}

const authorized = (path: string) =>
  mf.dispatchFetch(`http://localhost:8787/document/${documentId}/${path}`, {
    headers: { Authorization: `Bearer ${getTokenForDocument(documentId, "reader", "view")}` },
  });

test("an agent's AI peer resolves to the agent in metadata and blame", async () => {
  const aiPeer = 0xa1a1_a100_0000_0001n;
  const humanPeer = 4242n;
  await editAs({ user_id: "macro|owner@example.com", actor: "bot|agent-1" }, aiPeer, "agent ");
  await editAs({ user_id: "macro|human@example.com" }, humanPeer, "human ");

  const metadata = (await (await authorized("metadata")).json()) as {
    peers: { peer_id: string; user_id: string; actor: string | null }[];
  };
  expect(metadata.peers).toEqual(
    expect.arrayContaining([
      { peer_id: aiPeer.toString(), user_id: "macro|owner@example.com", actor: "bot|agent-1" },
      { peer_id: humanPeer.toString(), user_id: "macro|human@example.com", actor: null },
    ]),
  );

  const db = await mf.getD1Database("USER_PEER_MAPPING");
  await db
    .prepare("INSERT INTO blame (document_id, node_id, peer_id, timestamp_ms) VALUES (?, 'node', ?, 7)")
    .bind(documentId, aiPeer.toString())
    .run();
  expect(await (await authorized("blame/node")).json()).toEqual({
    peer_id: aiPeer.toString(),
    user_id: "macro|owner@example.com",
    actor: "bot|agent-1",
    timestamp_ms: 7,
  });
});
