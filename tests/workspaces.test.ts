import { beforeEach, test } from "node:test";
import assert from "node:assert/strict";
import { workspaceController } from "../src/controllers/WorkspaceController";
import { createDatabaseStores } from "../src/database/DatabaseStores";
import DatabaseBackupStore from "../src/database/DatabaseBackup";
import ProductItem from "../src/models/ProductItem";
import { resetEnvironment } from "./helpers/environment";

beforeEach(resetEnvironment);
test("empty first-time workspaces receive the demo offer once", async () => {
  assert.equal(await workspaceController.shouldOfferDemo(), true);
  workspaceController.dismissWelcome();
  assert.equal(await workspaceController.shouldOfferDemo(), false);
});
test("existing real data suppresses the first-visit prompt", async () => {
  const stores = createDatabaseStores();
  await stores.itemOS.addOne(
    new ProductItem({ id: "real", name: "Real item", amount: 10 }),
  );
  assert.equal(await workspaceController.shouldOfferDemo(), false);
});
test("starting demo selects only the current tab and seeds its separate database", async () => {
  const environment = resetEnvironment();
  await workspaceController.startDemo();
  assert.equal(workspaceController.isDemo(), true);
  assert.equal(environment.session.getItem("pos.workspace"), "demo");
  assert.equal(environment.reloads, 1);
  const demo = createDatabaseStores("POS_DEMO");
  assert.equal((await demo.itemOS.getAll()).length, 6);
  assert.equal((await demo.customerOS.getAll()).length, 3);
  assert.equal((await createDatabaseStores().itemOS.getAll()).length, 0);
});
test("demo restart replaces practice data and leaves real data untouched", async () => {
  const real = createDatabaseStores();
  await real.itemOS.addOne(
    new ProductItem({ id: "real", name: "Real item", amount: 10 }),
  );
  await workspaceController.resetDemo(true);
  const demo = createDatabaseStores("POS_DEMO");
  await demo.itemOS.addOne(
    new ProductItem({ id: "extra", name: "Extra", amount: 1 }),
  );
  await workspaceController.resetDemo(true);
  assert.equal((await demo.itemOS.getAll()).length, 6);
  assert.equal((await real.itemOS.getOne("real")).getAmount(), 10);
});
test("clearing demo empties every related table", async () => {
  await workspaceController.resetDemo(true);
  await workspaceController.resetDemo(false);
  const backup = await new DatabaseBackupStore(
    createDatabaseStores("POS_DEMO").database,
  ).export();
  assert.ok(Object.values(backup.tables).every((rows) => rows.length === 0));
});
test("returning to real data preserves demo records and clears the tab selection", async () => {
  const environment = resetEnvironment();
  await workspaceController.startDemo();
  workspaceController.useRealWorkspace();
  assert.equal(workspaceController.isDemo(), false);
  assert.equal(environment.reloads, 2);
  assert.equal(
    (await createDatabaseStores("POS_DEMO").itemOS.getAll()).length,
    6,
  );
});

test("switching back to demo preserves every saved demo table and real workspace data", async () => {
  const environment = resetEnvironment();
  const real = createDatabaseStores();
  await real.itemOS.addOne(
    new ProductItem({ id: "real", name: "Real item", amount: 10 }),
  );
  await workspaceController.startDemo();
  const demo = createDatabaseStores("POS_DEMO");
  await demo.itemOS.addOne(
    new ProductItem({ id: "practice", name: "My practice item", amount: 12 }),
  );
  await demo.itemOS.updateDetails("practice", "Edited practice item", 15);
  const beforeDemo = await new DatabaseBackupStore(demo.database).export();
  const beforeReal = await new DatabaseBackupStore(real.database).export();
  workspaceController.useRealWorkspace();
  workspaceController.useDemoWorkspace();
  assert.equal(workspaceController.isDemo(), true);
  assert.equal(environment.reloads, 3);
  assert.deepEqual(
    (await new DatabaseBackupStore(demo.database).export()).tables,
    beforeDemo.tables,
  );
  assert.deepEqual(
    (await new DatabaseBackupStore(real.database).export()).tables,
    beforeReal.tables,
  );
});
test("switching to a cleared demo does not silently reseed sample data", async () => {
  await workspaceController.resetDemo(false);
  workspaceController.useDemoWorkspace();
  assert.equal(workspaceController.isDemo(), true);
  const backup = await new DatabaseBackupStore(
    createDatabaseStores("POS_DEMO").database,
  ).export();
  assert.ok(Object.values(backup.tables).every((rows) => rows.length === 0));
});
test("failed workspace selection does not reload the app", () => {
  const environment = resetEnvironment();
  environment.session.failWrites = true;
  assert.throws(() => workspaceController.useDemoWorkspace());
  assert.equal(workspaceController.isDemo(), false);
  assert.equal(environment.reloads, 0);
});
