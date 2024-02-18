import * as path from "path";
import * as utils from "./utils.js";
import Database from "better-sqlite3"
import { addVersion } from "../src/addVersion.js"; 
import { createTables } from "../src/createTables.js"; 

test("Basic addition of a new version", () => {
    const testdir = utils.setupTestDirectory("addVersion");
    let opath = path.join(testdir, "test.sqlite3")
    let db = Database(opath);
    createTables(db);

    const meta = { "a.txt": utils.mockMetadata1(), "b/c.txt": utils.mockMetadata2() };
    addVersion(db, "foo", "bar", "whee", true, meta, new Set);

    // Checking that all the pieces were added.
    const vpayload = db.prepare("SELECT * FROM versions").all();
    expect(vpayload.length).toBe(1);
    expect(vpayload[0].vid).toBe(1);
    expect(vpayload[0].project).toBe('foo');
    expect(vpayload[0].asset).toBe('bar');
    expect(vpayload[0].version).toBe('whee');
    expect(vpayload[0].latest).toBe(1);

    const ppayload = db.prepare("SELECT * FROM paths").all();
    expect(ppayload.length).toBe(2);
    expect(ppayload[0].pid).toBe(1);
    expect(ppayload[0].vid).toBe(1);
    expect(ppayload[0].path).toBe("a.txt");
    expect(ppayload[1].pid).toBe(2);
    expect(ppayload[1].vid).toBe(1);
    expect(ppayload[1].path).toBe("b/c.txt");

    let tpayload = db.prepare("SELECT * FROM tokens WHERE token = 'chicken'").all();
    expect(tpayload.length).toBe(1);
    expect(tpayload[0].pid).toBe(1);
    expect(tpayload[0].field).toBe("ingredients.meat");

    tpayload = db.prepare("SELECT * FROM tokens WHERE token = 'Marcille'").all();
    expect(tpayload.length).toBe(1);
    expect(tpayload[0].pid).toBe(2);
    expect(tpayload[0].field).toBe("first_name");
})

test("New version can be added multiple times", () => {
    const testdir = utils.setupTestDirectory("addVersion");
    let opath = path.join(testdir, "test.sqlite3")
    let db = Database(opath);
    createTables(db);

    let meta = { "a.txt": utils.mockMetadata1() };
    addVersion(db, "foo", "bar", "whee", true, meta, new Set);

    let tpayload1 = db.prepare("SELECT * FROM tokens WHERE token = 'cream'").all();
    expect(tpayload1.length).toBe(1);
    let tpayload2 = db.prepare("SELECT * FROM tokens WHERE token = 'weird food'").all();
    expect(tpayload2.length).toBe(0);

    // Second addition deletes all existing entries in an cascading manner.
    meta = { "aa.txt": utils.mockMetadata2() };
    addVersion(db, "foo", "bar", "whee", true, meta, new Set);

    tpayload1 = db.prepare("SELECT * FROM tokens WHERE token = 'cream'").all();
    expect(tpayload1.length).toBe(0);
    tpayload2 = db.prepare("SELECT * FROM tokens WHERE token = 'weird food'").all();
    expect(tpayload2.length).toBe(1);
})

test("Version addition updates the latest version", () => {
    const testdir = utils.setupTestDirectory("addVersion");
    let opath = path.join(testdir, "test.sqlite3")
    let db = Database(opath);
    createTables(db);

    addVersion(db, "foo", "bar", "gastly", true, {}, new Set);
    addVersion(db, "foo", "bar", "haunter", true, {}, new Set);

    let vpayload = db.prepare("SELECT * FROM versions WHERE latest = 1").all();
    expect(vpayload.length).toBe(1);
    expect(vpayload[0].version).toBe('haunter');

    vpayload = db.prepare("SELECT * FROM versions WHERE latest = 0").all();
    expect(vpayload.length).toBe(1);
    expect(vpayload[0].version).toBe('gastly');
})

test("Version addition responds to tokenization", () => {
    const testdir = utils.setupTestDirectory("addVersion");
    let opath = path.join(testdir, "test.sqlite3")
    let db = Database(opath);
    createTables(db);

    let tokable = new Set(["description"]);
    addVersion(db, "foo", "bar", "gastly", true, { "recipe.json": utils.mockMetadata1() }, tokable);
    addVersion(db, "foo", "bar", "haunter", true, { "best_girl.txt": utils.mockMetadata2() }, tokable);

    let tpayload1 = db.prepare("SELECT * FROM tokens WHERE token = 'creamy'").all();
    expect(tpayload1.length).toBe(1);
    expect(tpayload1[0].field).toBe("description");
    expect(tpayload1[0].pid).toBe(1);

    let tpayload2 = db.prepare("SELECT * FROM tokens WHERE token = 'laios'").all();
    expect(tpayload2.length).toBe(1);
    expect(tpayload2[0].field).toBe("description");
    expect(tpayload2[0].pid).toBe(2);
})
