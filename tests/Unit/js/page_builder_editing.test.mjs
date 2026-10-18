import test from 'node:test';
import assert from 'node:assert/strict';
import { createLoadGuard } from '../../../resources/js/Components/PageBuilder/lib/loadGuard.ts';

test('load guard starts loading when asked and stops on release', () => {
    const guard = createLoadGuard(true);
    assert.equal(guard.isLoading(), true);
    guard.release();
    assert.equal(guard.isLoading(), false);
});

test('load guard marks programmatic work as loading and restores afterwards', () => {
    const guard = createLoadGuard(false);
    let seen = null;
    const result = guard.run(() => {
        seen = guard.isLoading();
        return 42;
    });
    assert.equal(seen, true);
    assert.equal(result, 42);
    assert.equal(guard.isLoading(), false);
});

test('load guard handles nesting and exceptions', () => {
    const guard = createLoadGuard(false);
    guard.run(() => {
        guard.run(() => {});
        assert.equal(guard.isLoading(), true, 'still loading after inner run ends');
    });
    assert.throws(() => guard.run(() => { throw new Error('boom'); }), /boom/);
    assert.equal(guard.isLoading(), false, 'exception must not leave the guard stuck');
});
